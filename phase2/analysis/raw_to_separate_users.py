#!/usr/bin/env python

"""
input: 
    one or multiple jsonl file(s) comprised of log data from various experiments and users
    [implicit] current working directory

output: jsonl files organized in a '[experiment_name]/[user_id].jsonl' structure
"""

import fileinput
import sys
import json
import os

def main():
    raw_to_separate_users()

def raw_to_separate_users():
    fileDict = {}

    f = fileinput.input()

    total_lines=0;

    for index, line in enumerate(f):

        try:
            obj = json.loads(line)

            user_id = obj["userid"]

            if not user_id in fileDict:

                print("processing user: %s" %(user_id))

                exp_name = obj["name"]

                file_name = os.path.join(os.path.curdir, exp_name, user_id + ".jsonl")
                
                if not os.path.exists(os.path.dirname(file_name)):
                    os.makedirs(os.path.dirname(file_name))

                fileDict[user_id] = open(file_name, 'w')

            fileDict[user_id].write(line)

            total_lines = total_lines + 1

        except KeyError as e:
            if e.args[0] == 'userid':
                log("user id not found in line %d: %s" % (index, line))
            else:
                raise e
        except Exception:
            log("cannot parse line %d: %s" % (index, line))


    print("processed %d users and %d lines" % (len(fileDict), total_lines))

    # close all files
    for k in fileDict:
        fileDict[k].close()


    f.close()

def log(message):
    f = open('raw_to_separate_users_log.txt', 'w');
    f.write(message)

    f.close()


if __name__ == "__main__":
    main()