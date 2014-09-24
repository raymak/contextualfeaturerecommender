#!/usr/bin/python

#person, feature, persontraits,  stage1_when, stage2_when...
'''


actions at this level:
-multiple "post" events into single event
    -condense into single "stage" event with count
-add demographic info to every line


output: 
=> person * feature * stage
=> person * feature
'''


import fileinput
import csv
import json
from collections import defaultdict

def parseHeader(line):
    inds = {}
    fields = line.strip().split('\t')
    for i in range(len(fields)):
        inds[fields[i]] = i
    return inds

def submit_user_group(user_group, id):
    final_stages = defaultdict(lambda: defaultdict(int))
    demoinfo = "NOT SET"
    for line in user_group:
        if line[inds["type"]] == "INSTALL":
            arm = line[inds["arm"]]
            if arm["ui"] == "none":
                #disambiguate - if no ui, make everything "None"
                arm["explanation"] = "none"
            demoinfo = arm["explanation"]+"-"+arm["ui"]

        if line[inds["triggerid"]] != "NA":
            ttype = line[inds["type"]]
            tstage = final_stages[line[inds["triggerid"]]]

            if ttype == "MINORTRIGGER":   
                count = line[inds["value"]]["count"] 
                if line[inds["value"]]["isrecommended"]:
                    tstage["trigger_after"] = max(count, tstage["trigger_after"])
                else:
                    tstage["trigger_before"] = max(count, tstage["trigger_before"])
            elif ttype == "SECONDARYLISTENER": 
                count = line[inds["value"]]["count"]  
                if line[inds["value"]]["recommended"]:
                    tstage["secondary_after"] = max(count, tstage["secondary_after"])
                else:
                    tstage["secondary_before"] = max(count, tstage["secondary_before"])
            elif ttype == "OFFERING":
                tstage["offered"] = True
            # elif ttype == "TRIGGER":
            #     tstage["triggered"] = True #minor trigger should also have fired with same count
            elif ttype == "REACTION":
                tstage["reacted"] = True
            elif ttype == "PANELSHOW":
                tstage["panelshown"] = True
            elif ttype == "PANELHIDE":
                tstage["panelhidden"] = True

    for key in final_stages:
        if "reacted" in final_stages[key] and "panelhidden" in final_stages[key]:
            del final_stages[key]["panelhidden"]

    for key,stat in final_stages.items():
        for statname, val in stat.items():
            print id, demoinfo, key, statname, val

def main(headerLine, messageLines):
    global inds
    inds = parseHeader(headerLine)
    print headerLine.strip()
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
