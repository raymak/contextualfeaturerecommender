#!/usr/bin/python

# input: csv-formatted stream, with each line corresponding to the data for a user
# output: 
# assumes the input messages from a specific user are contiguous   

import fileinput
import json

rev_inds = {}

def main(): 
    
    table = readInput()
    table = getTableByColumnValue(table, 'arm_name', 'explained-doorhanger-active')
    print len(table['arm_name'])

def getTableByColumnValue(table, column_name, column_value):
    new_table = {}

    selected_indices = [i for i in range(len(table[column_name])) if table[column_name][i] == column_value]

    for key in table:
        new_table[key] = [table[key][i] for i in selected_indices]

    return new_table



def readInput():

    table = {}

    for line in fileinput.input():   
        if fileinput.isfirstline():
            fields = line.strip().split('\t')
            
            for i in range(len(fields)):
                table[fields[i]] = []
                rev_inds[i] = fields[i]

        else: 

            jsonrow = [json.loads(val) for val in line.strip().split('\t')]

            for i in range(len(jsonrow)):
                table[rev_inds[i]].append(jsonrow[i])
            
    return table







if __name__ == "__main__":
    main()
