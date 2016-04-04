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

    fileDict = {}

    f = fileinput.input()

    for line in f:

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


    # close all files
    for k in fileDict:
        fileDict[k].close()


    f.close()


if __name__ == "__main__":
    main()