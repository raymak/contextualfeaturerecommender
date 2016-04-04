#!/usr/bin/env python

"""
Recursively searches the jsonl files in the given directory (or current directory by default) and checks the integrity of each jsonl file.

Checks for:

    - Missing messages
    - Missing end flag
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

def main():

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

    with open(file_name, 'r') as f:
        jsonl_list = [s for s in f.readlines()]

        log_set = UserLogSet(jsonl_list)

        # missing messages
        first, last = log_set.get_bounds()

        count = len(log_set)

        print("start: %d, end: %d, count: %d" % (first, last, count))

        if last != count:
            report("%d messages missing" %(last - count), file_name)

        # flag messages

        #FIRST_RUN
        if (not 1 in log_set) or (log_set[1]['type'] != 'FIRST_RUN'):
            report("FIRST_RUN missing", file_name)

        # ANY TYPE OF ENDING
        lm = log_set[last]

        if  not ( 
            lm['type'] == 'SELF_DESTRUCT' or
            lm['type'] == 'UNLOAD' and lm['attrs']['reason'] == 'disable' or
            lm['type'] == 'UNLOAD' and lm['attrs']['reason'] == 'uninstall'
            ):
            report("end flag missing", file_name)


        # WARNINGS
        c = len(log_set.type("WARNING"))
        if c > 0:
            report( "%d warning(s)" % c, file_name)

        # ERRORS
        c = len(log_set.type("ERROR"))
        if c > 0:
            report("%d error(s)" % c, file_name)



def report(m, file_name):
    print("  %s" %(m))

if __name__ == "__main__":
    main()