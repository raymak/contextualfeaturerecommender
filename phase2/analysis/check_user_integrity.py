#!/usr/bin/env python

"""
Recursively searches the jsonl files in the given directory (or current directory by default) and checks the integrity of each jsonl file.

Checks for:

    - Missing messages
    - Missing end flag
    - Disabled by user
    - Missing start flag
    - Warning messages
    - Error messages

input:
    [implicit] current working directory or [explicit] optional input directory

output: 
    name of the flawed files with the reason

"""

import fileinput
import sys
import json
from userlogset import *
from analysis_tools import *
import userintegrity as ui
import imp
try:
    imp.find_module('termcolor')
    cFound = True
except ImportError:
    cFound = False

if (cFound):
    from termcolor import colored, cprint
else:
    print("You can install termcolor ('pip install termcolor') to see some messages in color.")

errFound = False
warnFound = False

SEVERITY = {
    'message_missing': 'critical',
    'first_run_missing': 'critical',
    'proper_ending': 'critical',
    'user_disable': 'warning',
    'warning': 'warning',
    'error': 'critical'
}
def main():

    if (len(sys.argv) > 1):
        rootDir = sys.argv[1]
    else:
        rootDir = "."

    for file_name in traverse_dirs(rootDir, 'jsonl'):
        print("\nchecking " + file_name)
        check(file_name)


def check(file_name):

    global warnFound, errFound

    warnFound = False
    errFound = False

    with open(file_name, 'r') as f:

        jsonl_list = [s for s in f.readlines()]

        log_set = UserLogSet(jsonl_list)

        reports = ui.check(log_set)
        print_reports(reports)

def print_reports(reports):

    for r in reports:
        if r.passed and r.messages[0]:
            passed(r.messages[0], r.name)

        if not r.passed:
            failed(r.messages[1], r.name)


def warn(m):
    global warnFound

    if cFound:
        cprint('  %s' % m, 'yellow')
    else:
        print('  %s' % m)

    warnFound = True

def err(m):
    global errFound

    if cFound:
        cprint('\u2718 %s' % m, 'red')
    else:
        print('\u2718 %s' % m)

    errFound = True

def ok(m):
    if cFound:
        cprint('\u2713 %s' % m, 'green')
    else:
        print('\u2713 %s' % m)

def passed(m, name):
    ok(m)

def failed(m, name):
    if SEVERITY[name] == 'critical':
        err(m)
    else:
        warn(m)



if __name__ == "__main__":
    main()