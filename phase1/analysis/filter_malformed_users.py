#!/usr/bin/python

''' 
read in users, yield ones with personality

filtering at this level:
(-anyone without first event
    -WARNING: may be nonrandom, not checking)
=> own script?
-anyone with events that "dont make sense"
    -stage x+1 without stage x
'''
#take in entire person
#see if existence of startup
#poop out entire person if exists, otherwise continue
#WATCH FOR FENCEPOST ERROR
#get (array of) lines for a person as an arg
#print stage to file handle, as globals
    #read in as streams, output to files
    #print out errors, std.out/std.error open for using, can create by side-effect
#feed into raw_to_analysis.py

import fileinput
import json
import csv
from collections import defaultdict
from pprint import pprint as pp

inds = {}

def parseHeader(line):
    inds = {}
    fields = line.strip().split('\t')
    for i in range(len(fields)):
        inds[fields[i]] = i
    return inds

def submit_user_group(user_group, id):
    #short circuit with version, test_mode
    trigger_stages = defaultdict(lambda: defaultdict())
    has_install = False
    for line in user_group:
        if line[inds["type"]] == "INSTALL":
            has_install = True
            test_mode = line[inds["test_mode"]]
            addon_version = line[inds["addon_version"]]

        if line[inds["triggerid"]] != "NA":
            ttype = line[inds["type"]]
            tstage = trigger_stages[line[inds["triggerid"]]]

            if ttype == "MINORTRIGGER":    
                if line[inds["value"]]["isrecommended"]:
                    tstage["trigger_after"] = True
                else:
                    tstage["trigger_before"] = True
            elif ttype == "SECONDARYLISTENER":  
                if line[inds["value"]]["recommended"]:
                    tstage["secondary_after"] = True
                else:
                    tstage["secondary_before"] = True
            elif ttype == "OFFERING":
                tstage["offered"] = True
            elif ttype == "TRIGGER":
                tstage["triggered"] = True #minor trigger should also have fired with same count
            elif ttype == "REACTION":
                tstage["reacted"] = True
            elif ttype == "PANELSHOW":
                tstage["panelshown"] = True
            elif ttype == "PANELHIDE":
                tstage["panelhidden"] = True
            elif ttype == "LASTCALL":
                pass #we didn't expect this to happen
                    #could check that nothing else happened, but not really that important
            ##TOFIX: make sure it's been at least 2 weeks
            else:
                print ttype #shouldn't happen
    
    if not has_install or test_mode or addon_version != "2.0.1": 
        return

    for key in trigger_stages:
        stage = trigger_stages[key]
        if "offered" in stage and not "triggered" in stage: 
            return
        elif "triggered" in stage and not "trigger_before" in stage: 
            return
        elif "panelshown" in stage and not "offered" in stage: 
            return
        elif "panelhidden" in stage and not "panelshown" in stage: 
            return
        elif "reacted" in stage and not "panelhidden" in stage:
            return

    for line in user_group:
        print "\t".join(map(json.dumps, line))

def main(headerLine, messageLines):
    print headerLine.strip()
    global inds
    inds = parseHeader(headerLine)
    #print some headers

    first_block = True

    for line in messageLines:
        line = map(json.loads, line.split("\t"))
        new_id = line[inds["userid"]]
        if first_block is True: 
            first_block = False
            curr_id = line[inds["userid"]]
            user_group = []
        elif new_id != curr_id:
            submit_user_group(user_group, curr_id)
            user_group = []
            curr_id = new_id
        user_group.append(line)

    #submit last group    
    if len(user_group) > 0:
        submit_user_group(user_group, curr_id)

if __name__ == "__main__":
    lines = fileinput.input()
    main(lines.next(), lines)


