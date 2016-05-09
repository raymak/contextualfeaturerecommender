#!/usr/bin/env python

"""

Recursively searches the jsonl files in the given directory (or current directory by default) 
    and extracts dependent variables for each user. It then generates cross-user data reports and data frames.

input:
    [implicit] current working directory or [explicit] optional input directory
    

output:

"""

import sys
from analysis_tools import *
import pandas as pd
from pandas import Series, DataFrame
import numpy as np
import userintegrity
import os

DPVS = ['n_deliv_recs', 'n_inactive_recs']  # n_deliv_recs, n_inactive_recs
IPVS = ['moment', 'coeff', 'rate'] # moment, coeff, rate, condition
INFO = ['name'] # userid, os

def main():

    if (len(sys.argv) > 1):
        rootDir = sys.argv[1]
    else:
        rootDir = "."

    # creating user profiles

    user_profiles = extract_user_profiles(rootDir)

    calculate_ipvs(user_profiles)
    calculate_dpvs(user_profiles)
    check_user_integrity(user_profiles)

    df = generate_table(user_profiles)

def check_user_integrity(ups):

    for up_id, up in ups.items():
        up.check_integrity(userintegrity.check)

def calculate_dpvs(ups):

    for up_id, up in ups.items():

    # number of delivered recommendations
        up.add_dpv('n_deliv_recs', n_deliv_recs)

def calculate_ipvs(ups):

    for up_id, up in ups.items():

        for ipv in IPVS:
            up.add_ipv(ipv, globals()[ipv])

        for dpv in DPVS:
            up.add_dpv(dpv, globals()[dpv])


def generate_table(ups, title = "untitled_table", ipvs = IPVS, dpvs = DPVS, info = INFO):

    """
        generates data report tables and saves them to files
    """

    def get_dpvs(name):
        return Series([up.dpvs[name] for up_id,up in sorted(ups.items())])

    def get_ipvs(name):
        return Series([up.ipvs[name] for up_id,up in sorted(ups.items())])

    def get_info(name):
        return Series([getattr(up, name) for up_id, up in sorted(ups.items())])


    table = DataFrame()

    for inf in info:
        table[inf] = get_info(inf)

    for ipv in ipvs:
        table[ipv] = get_ipvs(ipv)

    for dpv in dpvs:
        table[dpv] = get_dpvs(dpv)

    print(table)

    save_table(table, title)

    return table

def save_table(table, title):

    f_dir = os.path.join(os.getcwd(), "tables")
    os.makedirs(f_dir, exist_ok = True)
    f_path = os.path.join(f_dir, title)

    i = 0
    while os.path.exists(f_path):
        i += 1
        f_path = os.path.join(f_dir, title + ' %s' % i)

    with open(f_path, 'w') as f:
        table.to_csv(f)

def extract_user_profiles(rootDir):
    ups = {}

    for file_name in traverse_dirs(rootDir, 'jsonl'):
        up = user_profile_from_file(file_name)
        ups[up.userid] = up

    return ups


### dpv evaluation functions

def n_deliv_recs(up):

    try:
        log = up.log_set
        feat_report_l = log.type("FEAT_REPORT").last()
        attrs = feat_report_l['attrs']

        count = 0

        for rec_id in attrs:
            if (attrs[rec_id]['status'] == 'delivered'):
                count += 1

        return count

    except IndexError:
        return None

def n_inactive_recs(up):

    try:
        log = up.log_set
        feat_report_l = log.type("FEAT_REPORT").last()
        attrs = feat_report_l['attrs']

        count = 0

        for rec_id in attrs:
            if (attrs[rec_id]['status'] == 'inactive'):
                count += 1

        return count

    except IndexError:
        return None


### ipv evaluation functions

def condition(up):
    return up.condition

def moment(up):
    return up.mode['moment']

def rate(up):
    return up.mode['rateLimit']

def coeff(up):
    return up.mode['coeff']

if __name__ == "__main__":
    main()


