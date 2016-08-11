#!/usr/bin/env python

"""

Recursively searches through the jsonl files in the given root directory (or the current directory by default) 
    and extracts variables of interest for each user. It then generates, prints, and saves cross-user data reports and data frames.

input:
    [implicit] current working directory or [explicit] optional input directory
    

output:

"""

import sys
import json
from analysis_tools import *
import pandas as pd
from pandas import Series, DataFrame
import numpy as np
import userintegrity
import os
import argparse
import importlib.util as imp


DPVS = ['adoption_rate', 'et', 'ett', 'interruptible_ifreq', 'random_ifreq', 'n_recs_status', 'n_out_or_deliv_recs', 'try_or_adoption_rate', 'long_inactivity_lengths_ifreq', 'startup_ifreq']
IPVS = ['moment', 'coeff', 'rate'] # moment, coeff, rate, condition
INFO = ['name', 'userid', 'os'] # userid, os
FVS = ['f_adoption_rate', 'f_adoption_try_rate', 'f_n_recs_status']

opts = None
config = None

def main():

    global opts
    global config
    parser = argparse.ArgumentParser(description='Recursively searches through the jsonl files in the given directory (or the current directory by default) and extracts variables of interest for each user. It then generates, prints, and saves cross-user data reports and data frames.')
    parser.add_argument('-r', '--rdir', help='root directory -- current directory by default')
    parser.add_argument('-o', '--output', help='output directory', default='.')
    parser.add_argument('-v', '--verbosity', action='count', default=0)
    parser.add_argument('-c', '--config', help='analysis config file')
    opts = parser.parse_args()

    load_config()

    rootDir = opts.rdir or (config and getattr(config, 'rdir', None)) or '.'
    log('resolved root directory: ' + rootDir,[], opts.verbosity > 0)

    # creating user profiles

    user_profiles = extract_user_profiles(rootDir)

    check_user_integrity(user_profiles)

    generate_integrity_report(user_profiles)

    user_profiles = filter_by_exclude(user_profiles)
    user_profiles = filter_by_test(user_profiles)

    log("%d profiles will be analyzed" %len(user_profiles))

    calculate_variables(user_profiles)

    df = generate_variables_table(user_profiles)
    generate_user_info_table(user_profiles)
    generate_features_variables_table(user_profiles)

def load_config():
    global opts
    global config
    global DPVS, IPVS, INFO

    if opts.config:
        spec = imp.spec_from_file_location("config", os.path.abspath(opts.config))
        config = imp.module_from_spec(spec)
        spec.loader.exec_module(config)
        log('loading config file: %s' % resolve_abspath(opts.config), ['config'], opts.verbosity > 0)
    else:
        log('no config file found', ['config'], opts.verbosity > 0)

    if config and getattr(config, 'DPVS', None):
        log('replacing DPVS from the config file', ['config'], opts.verbosity > 0)
        DPVS[:] = getattr(config, 'DPVS')

    if config and getattr(config, 'IPVS', None):
        log('replacing IPVS from the config file', ['config'], opts.verbosity > 0)
        IPVS[:] = getattr(config, 'IPVS')

    if config and getattr(config, 'INFO', None):
        log('replacing INFO from the config file', ['config'], opts.verbosity > 0)
        INFO[:] = getattr(config, 'INFO')

    if config and getattr(config, 'modules', None):
        for module in config.modules:
            try:
                path = resolve_abspath(module)
                spec = imp.spec_from_file_location(module, resolve_abspath(module))
                mod = imp.module_from_spec(spec)
                spec.loader.exec_module(mod)
                globals().update(mod.exports)
                log('loading extension module file: %s' % path, ['config', 'extension'], opts.verbosity > 0)
            except FileNotFoundError:
                log('could not resolve extension file path: %s' % module, ['config', 'extension'], True)


def resolve_abspath(f_name):
    if os.path.exists(os.path.abspath(f_name)):
        return os.path.abspath(f_name)

    for p in os.environ["PATH"].split(os.pathsep):
        if os.path.exists(os.path.join(p, f_name)):
            return os.path.abspath(os.path.join(p, f_name))

    raise FileNotFoundError

def check_user_integrity(ups):
    """
        calls the 'check_integrity' method on all the given user profiles (as a dict)
    """

    for up_id, up in ups.items():
        up.check_integrity(userintegrity.check)

def calculate_variables(ups, ipvs = IPVS, dpvs = DPVS):

    for up_id, up in ups.items():

        for ipv in ipvs:
            up.add_ipv(ipv, globals()[ipv])


        for dpv in dpvs:
            up.add_dpv(dpv, globals()[dpv])

def filter_by_exclude(ups):
    """
        excludes certain users from the analysis based on the function 'exclude'
        if it exists in the config file
    """

    if not (config and getattr(config, 'exclude', None)): return ups

    new_ups = {}
    
    for up_id, up in ups.items():
        if not getattr(config, 'exclude')(up):
            new_ups[up_id] = up
        else:
            log('user ' + up.userid + ' exluded from analysis', ['filter', 'exclude'], opts.verbosity > 0)

    return new_ups


def filter_by_test(ups):
    """
        filters users who don't pass the tests specified by FATAL_TEST in the config file
    """

    new_ups = {}

    for up_id, up in ups.items():
        reports = up.integrity_reports
        filter_user = False

        for r in reports.values():
            if not r.passed and is_test_fatal(r): filter_user = True

        if filter_user:
            log('user ' + up.userid + ' exluded from analysis', ['filter', 'test'], opts.verbosity > 0)
        else:
            new_ups[up_id] = up

    return new_ups

def generate_user_info_table(ups, title = 'user_info_table'):
    """
        generates a table of the basic information about the users
    """

    def get_info(name):
        return Series([getattr(up, name) for up_id, up in sorted(ups.items())])

    table = DataFrame()

    for f in ['name', 'userid', 'startTimeMs', 'is_test', 'startLocaleTime', 'mode', 'locale', 'os', 'system_version', 'addon_id', 'addon_version']:
        table[f] = get_info(f)

    save_table(table, title)

    log(title + '\n' + str(table),[], opts.verbosity > 0)
        
    return table

def generate_variables_table(ups, title = 'variables_table', ipvs = IPVS, dpvs = DPVS, info = INFO):
    """
        generates a table of the main variables of interest (per user) and saves it
    """

    def get_dpvs(name):
        return DataFrame([up.dpvs[name] for up_id,up in sorted(ups.items())])        

    def get_ipvs(name):
        return DataFrame([up.ipvs[name] for up_id,up in sorted(ups.items())])

    def get_info(name):
        return Series([getattr(up, name) for up_id, up in sorted(ups.items())])


    table = DataFrame()

    for inf in info:
        table[inf] = get_info(inf)

    for ipv in ipvs:
        # table[ipv] = get_ipvs(ipv)
        table = pd.concat([table, get_ipvs(ipv)], axis=1)

    for dpv in dpvs:
        # table[dpv] = get_dpvs(dpv)
        table = pd.concat([table, get_dpvs(dpv)], axis=1)

    save_table(table, title)

    log(title + '\n' + str(table),[], opts.verbosity > 0)

    return table

def generate_features_variables_table(ups, title = 'features_table', fvs = FVS):
    """
        generates a table of the main variables of interest (per feature) and saves it
    """

    def feature_id_list():
        for up_id,up in ups.items():
            try:
                attrs = up.log_set.type('FEAT_REPORT').last()['attrs']
                if not len(attrs.keys()): continue
                return list(set(attrs.keys()) | {'fullScreenShortcut', 'fullScreenShortcut-darwin'})
            except KeyError:
                continue

    id_list = feature_id_list()

    def get_fvs(fv):
        res = []
        for f_id in id_list:
            val = globals()[fv](ups, f_id)
            if type(val) != dict:
                val = {fv: val}
            res.append(val)

        return DataFrame(res)

    table = DataFrame()

    table['id'] = Series(id_list)

    for fv in fvs:
        table = pd.concat([table, get_fvs(fv)], axis=1)

    save_table(table, title)

    log(title + '\n' + str(table),[], opts.verbosity > 0)

    return table

def generate_integrity_report(ups, title='user_integrity_report'):

    with open(make_file_path('reports', title), 'w') as f:
        for up_id, up in ups.items():
            reports = up.integrity_reports
            filter_user = False

            f.write('User ID: %s \n\n' % up_id)
            for r in reports.values():
                if r.passed and r.messages[0]:
                    f.write('%s : %s => passed\n' % (r.name, r.messages[0]))

                if not r.passed:
                    if is_test_fatal(r):
                        f.write('%s : %s => failed - fatal\n' % (r.name, r.messages[1]))
                        filter_user = True
                    else: 
                        f.write('%s : %s => failed - skipped\n' % (r.name, r.messages[1]))

            f.write('====================================\n')
            if filter_user:
                f.write("excluded from analysis")
            f.write('\n\n')


def log(m, tags=[], to_console= False):
    """
        logs analysis messages to a log file + console if to_console is True
    """

    with open(make_file_path('log', 'log', '.txt', True), 'a') as f:
        if len(tags) > 0:
            f.write(str(tags) + ' ' + m +  '\n')
            if to_console:
                print(tags, m)
        else:
            f.write(m + '\n')
            if to_console:
                print(m)



def is_test_fatal(report):
    """
        based on the FATAL_TESTS variable in the config file, determines if a user should be excluded from the analysis
        if a certain test fails.
    """

    tests = config and getattr(config, 'FATAL_TESTS', None)

    if not tests:
        return False

    for test in tests:
        if report.name == test and tests[test] is not None:
            fatal = True
            for k in tests[test]:
                if not k in report.data or tests[test][k] != report.data[k]:
                    fatal = False

            if fatal:
                return True  

    return False

def save_table(table, title = 'untitled_table'):

    with open(make_file_path('tables', title, '.csv'), 'w') as f:
        table.to_csv(f)

def make_file_path(dirName, title, extension='', rewrite=False):
    """
        finds a file name using the base directory, creates numbered file names to avoid rewriting if rewrite is False
    """

    global opts
    baseDir = (opts and opts.output) or (config and config.getattr(config, 'output', None)) or os.getcwd()
    f_dir = os.path.join(os.path.abspath(baseDir), dirName)
    os.makedirs(f_dir, exist_ok = True)
    f_path = os.path.join(f_dir, title + extension)

    if rewrite: return f_path

    i = 0
    while os.path.exists(f_path):
        i += 1
        f_path = os.path.join(f_dir, title + '%s' % i + extension)

    return f_path

def extract_user_profiles(rootDir):
    ups = {}

    for file_name in traverse_dirs(rootDir, 'jsonl'):
        try:
            up = user_profile_from_file(file_name)
            ups[up.userid] = up
        except Exception as e:
            log("Could not load user log file: %s" %file_name,['warning'],True)
            raise e

    return ups


### dpv evaluation functions

def n_recs_status(up):
    """
        extracts the number of feature recommendations for each status
    """

    try:
        log = up.log_set
        feat_report_l = log.type('FEAT_REPORT').last()
        attrs = feat_report_l['attrs']

        counts = {'n_recs_outstanding': 0, 'n_recs_inactive': 0, 'n_recs_delivered': 0, 'n_recs_active': 0}

        for rec_id in attrs:
            counts['n_recs_' + attrs[rec_id]['status']] += 1

        return counts

    except KeyError:
        return {'n_recs_outstanding': None, 'n_recs_inactive': None, 'n_recs_delivered': None, 'n_recs_active': None}

def n_out_or_deliv_recs(up):
    """
        extracts the number of outstanding or delivered feature recommendations
    """

    try:
        log = up.log_set
        feat_report_l = log.type('FEAT_REPORT').last()
        attrs = feat_report_l['attrs']

        count = 0

        for rec_id in attrs:
            if (attrs[rec_id]['status'] == 'outstanding' or attrs[rec_id]['status'] == 'delivered'):
                count += 1

        return count

    except KeyError:
        return None

def try_or_adoption_rate(up):
    """
        calculates the try or adoption rate
    """

    try:
        log = up.log_set
        attrs = log.type('FEAT_REPORT').last()['attrs']

        n_delivered = 0
        n_adopted_tried = 0

        for rec_id in attrs:
            if attrs[rec_id]['status'] == 'delivered' and rec_id != 'welcome':
                n_delivered += 1
                if attrs[rec_id]['adopted'] or attrs[rec_id]['tried']:
                    n_adopted_tried += 1

        if n_delivered < 1:
            return None

        return n_adopted_tried/n_delivered

    except KeyError:
        return None

def adoption_rate(up):
    """
        calculates the adoption rate
    """

    try:
        log = up.log_set
        feat_report_l = log.type('FEAT_REPORT').last()
        attrs = feat_report_l['attrs']

        n_delivered = 0
        n_adopted = 0

        for rec_id in attrs:
            if attrs[rec_id]['status'] == 'delivered' and rec_id != 'welcome':
                n_delivered += 1
                if (attrs[rec_id]['adopted']):
                    n_adopted += 1

        if n_delivered < 1:
            return None

        return n_adopted/n_delivered

    except KeyError:
        return None

def random_ifreq(up):

    try:
        log = up.log_set
        stats_report = log.type('STATS_REPORT').last()

        return stats_report['attrs']['moment random']['ifreq']

    except Exception:
        return None

def interruptible_ifreq(up):

    try:
        log = up.log_set
        stats_report = log.type('STATS_REPORT').last()

        return stats_report['attrs']['moment interruptible']['ifreq']

    except Exception:
        return None

def long_inactivity_lengths_ifreq(up):

    # try:
    counts = {'10m': 0, '15m': 0, '20m': 0}
    lib_log = up.log_set.type('LONG_INACTIVITY_BACK')

    for l in lib_log:
        if (l['attrs']['length'] > 600): counts['10m'] += 1
        if (l['attrs']['length'] > 900): counts['15m'] += 1
        if (l['attrs']['length'] > 1200): counts['20m'] += 1

    et = lib_log.last()['et']

    ifreqs = {(l+'_ifreq'):(et/c if c !=0 else et) for l,c in counts.items()}

    return ifreqs

    # except Exception:
        # return {'10m_ifreq': None, '15m_ifreq': None, '10m_ifreq': None}

def startup_ifreq(up):
    try:
        return up.log_set.type('STATS_REPORT').last()['attrs']['load']['ifreq']
    except Exception:
        return None

def et(up):
    return up.log_set.last()['et']

def ett(up):
    return up.log_set.last()['ett']

### ipv evaluation functions

def condition(up):
    return up.condition

def moment(up):
    return up.mode['moment']

def rate(up):
    return up.mode['rateLimit']

def coeff(up):
    return up.mode['coeff']

### fvs evaluation functions
def f_adoption_rate(ups, feature_id):
    """
        calculates the adoption rate for each feature
    """

    n_delivered = 0
    n_adopted = 0

    try:
        for up_id,up in ups.items():
            attrs = up.log_set.type('FEAT_REPORT').last()['attrs']

            if not feature_id in attrs: continue

            if attrs[feature_id]['status'] == 'delivered':
                n_delivered += 1
                if attrs[feature_id]['adopted']:
                    n_adopted += 1


        if n_delivered == 0: return None

        return n_adopted/n_delivered

    except KeyError:
        return None

def f_adoption_try_rate(ups, feature_id):
    """
        calculates the adoption rate for each feature
    """

    n_delivered = 0
    n_adopted_tried = 0

    try:
        for up_id,up in ups.items():
            attrs = up.log_set.type('FEAT_REPORT').last()['attrs']

            if not feature_id in attrs: continue

            if attrs[feature_id]['status'] == 'delivered':
                n_delivered += 1
                if attrs[feature_id]['adopted'] or attrs[feature_id]['tried']:
                    n_adopted_tried+= 1


        if n_delivered == 0: return None

        return n_adopted_tried/n_delivered

    except KeyError:
        return None

def f_n_recs_status(ups, feature_id):
    """
        extracts the number of users with each recommendation delivery status for the feature
    """

    counts = {'n_recs_outstanding': 0, 'n_recs_inactive': 0, 'n_recs_delivered': 0, 'n_recs_active': 0}

    for up_id,up in ups.items():
        try:
            attrs = up.log_set.type('FEAT_REPORT').last()['attrs']

            counts['n_recs_' + attrs[feature_id]['status']] += 1

        except KeyError:
            continue

    return counts

if __name__ == '__main__':
    main()


