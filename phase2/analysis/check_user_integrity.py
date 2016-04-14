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
    [implicit] current working directory

output: 
    name of the flawed files with the reason

"""

import fileinput
import sys
import json
import os
from userlogset import *
import imp
try:
    imp.find_module('termcolor')
    cFound = True
except ImportError:
    cFound = False

if (cFound):
    from termcolor import colored, cprint

errFound = False
warnFound = False

def main():

    print(warnFound, errFound)

    if (len(sys.argv) > 1):
        rootDir = sys.argv[1]
    else:
        rootDir = "."

    for root, dirs, files in os.walk(rootDir):
        for name in files:
            ext = os.path.splitext(name)[1]
            if ext == '.jsonl':
                file_name = os.path.join(root, name)
                print("\nchecking " + file_name)
                check(file_name)


def check(file_name):

    global warnFound, errFound

    warnFound = False
    errFound = False

    with open(file_name, 'r') as f:

        jsonl_list = [s for s in f.readlines()]

        log_set = UserLogSet(jsonl_list)

        # missing messages
        first, last = log_set.get_bounds()

        count = len(log_set)

        print("start: %d, end: %d, count: %d" % (first, last, count))

        if last != count:
            err("%d messages missing" %(last - count), file_name)

        # flag messages

        #FIRST_RUN
        if (not 1 in log_set) or (log_set[1]['type'] != 'FIRST_RUN'):
            err("FIRST_RUN missing", file_name)

        # ANY TYPE OF ENDING
        lm = log_set[last]

        if  not ( 
            lm['type'] == 'SELF_DESTRUCT' or
            lm['type'] == 'UNLOAD' and lm['attrs']['reason'] == 'disable' or
            lm['type'] == 'UNLOAD' and lm['attrs']['reason'] == 'uninstall' or
            lm['type'] == 'DISABLE' and lm['attrs']['reason'] == 'uninstall'
            ):
            err("end flag missing", file_name)

        # DISABLED BY USER

        if not (
            log_set[last]['type'] == 'SELF_DESTRUCT' or
            log_set[last-1]['type'] == 'SELF_DESTRUCT' or
            log_set[last-2]['type'] == 'SELF_DESTRUCT'
            ) and (
            lm['type'] == 'UNLOAD' and lm['attrs']['reason'] == 'disable' or
            lm['type'] == 'UNLOAD' and lm['attrs']['reason'] == 'uninstall' or
            lm['type'] == 'DISABLE' and lm['attrs']['reason'] == 'uninstall' or
            lm['type'] == 'DISABLE' and lm['attrs']['reason'] == 'disable'
            ):
            warn("disabled by user", file_name)

        # WARNINGS
        c = len(log_set.type("WARNING"))
        if c > 0:
            warn( "%d warning(s)" % c, file_name)

        # ERRORS
        c = len(log_set.type("ERROR"))
        if c > 0:
            err("%d error(s)" % c, file_name)

        if not (warnFound or errFound):
            ok(file_name)


def warn(m, file_name):
    global warnFound

    if cFound:
        cprint("  %s" %(m), 'yellow')
    else:
        print("  %s" %(m))

    warnFound = True

def err(m, file_name):
    global errFound

    if cFound:
        cprint("  %s" %(m), 'red')
    else:
        print("  %s" %(m))

    errFound = True

def ok(file_name):
    if cFound:
        cprint(u'\u2713 GOOD', 'green')
    else:
        print(u'\u2713 GOOD')

if __name__ == "__main__":
    main()