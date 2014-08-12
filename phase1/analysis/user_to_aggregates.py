#!/usr/bin/python

# input: csv-formatted stream, with each line corresponding to the data for a user
# output: 
# assumes the input messages from a specific user are contiguous   

import fileinput
import json

rev_inds = {}

FEATURE_NAMES = [
'closetabshortcut',
 'newbookmark',
  'newtabshortcut',
   'newbookmarkshortcut',
    'blushypage', 'facebook',
     'amazon',
      'youtube',
       'download',
        'gmail',
         'reddit']

RECORD_KEYS_ARR = [
'userid',
 'experiment_name',
  'addon_ver',
   'test_mode_enabled',
    'experiment_ver',
     'locale',
      'system_name',
       'system_ver',
        'os',
         'arm_name',
          'num_of_extensions',
           'DNT_enabled',
            'history_enabled',
             'browsertabsremote_enabled',
              'expstarttime_ms',
              'theme_changed',
               'active_theme_name',
                'active_theme_id',
                 'has_disabled',    
                   'has_moved_button',
                    'total_recommendations' 
] + [featureName + suffix for featureName in FEATURE_NAMES 
    for suffix in ['_recommended_seen',
     '_recommended',
      '_secondary_used_after',
       '_secondary_used_before',
        '_minor_used_after',
         '_reaction_used',
          '_addon_ignored']
       ]

ARMS_ROWS_KEYS_ARR = [
  'name',
   'user_num',
    'has_disabled',
     'has_moved_button',
      'median_num_of_extensions',
       'median_total_recommendations' 
] + [featureName + suffix for featureName in FEATURE_NAMES
      for suffix in ['_recommended_seen',
     '_recommended',
      '_secondary_used_after',
       '_secondary_used_before',
        '_minor_used_after',
         '_reaction_used',
          '_addon_ignored']
          ]

def main(): 

    table = readInput()
    table = basicFilter(table)
    generateAggregateData(table)


def basicFilter(table):


    selected_indices = [i for i in range(len(table['userid']))
        if table['experiment_ver'][i] == '2.0.0'
        and table['num_of_extensions'][i] is not None
        and not table['test_mode_enabled'][i]
        and not table['browsertabsremote_enabled'][i]
    ]

    new_table = {key: [table[key][i] for i in selected_indices] for key in table }

    return new_table


def getTableByColumnValue(table, column_name, column_value):

    selected_indices = [i for i in range(len(table[column_name])) if table[column_name][i] == column_value]

    new_table = {key: [table[key][i] for i in selected_indices] for key in table}

    return new_table

def generateAggregateData(table):

    armsTables = {
        'explained-doorhanger-active': {},
        'explained-doorhanger-passive': {},
        'unexplained-doorhanger-active': {},
        'unexplained-doorhanger-passive': {},
        'control': {}
        }

    for arm in armsTables:
        armsTables[arm] = getTableByColumnValue(table, 'arm_name', arm)

    # print armsTables['control']['arm_name']

    armsRows = {arm: {'name': arm} for arm in armsTables.keys()}

    #feature secondary listener after

    for arm in armsRows:
        # print arm
        
        armsRows[arm]['user_num'] = len(armsTables[arm]['userid'])
        # print 'user_num', armsRows[arm]['user_num']

        userNum = armsRows[arm]['user_num']

        col_name  = 'has_disabled'
        armsRows[arm][col_name] = armsTables[arm][col_name].count(True)
        # print arm, col_name, armsRows[arm][col_name]

        col_name  = 'has_moved_button'
        armsRows[arm][col_name] = armsTables[arm][col_name].count(True)
        # print arm, col_name, armsRows[arm][col_name]

        col_name = 'median_num_of_extensions'
        armsRows[arm][col_name] = sorted(armsTables[arm]['num_of_extensions'])[userNum // 2]
        # print arm, col_name, armsRows[arm][col_name]

        col_name = 'median_total_recommendations'
        armsRows[arm][col_name] = sorted(armsTables[arm]['total_recommendations'])[userNum // 2]
        # print arm, col_name, armsRows[arm][col_name]
        
        for featureName in FEATURE_NAMES:
           

            col_name  = featureName +'_recommended'
            armsRows[arm][col_name] = armsTables[arm][col_name].count(True)
            # print arm, col_name, armsRows[arm][col_name]

            col_name  = featureName +'_recommended_seen'
            armsRows[arm][col_name] = armsTables[arm][col_name].count(True)
            # print arm, col_name, armsRows[arm][col_name]

            col_name  = featureName +'_secondary_used_before'
            armsRows[arm][col_name] = armsTables[arm][col_name].count(True)
            # print arm, col_name, armsRows[arm][col_name]
            
            col_name  = featureName +'_secondary_used_after'
            armsRows[arm][col_name] = armsTables[arm][col_name].count(True)
            # print arm, col_name, armsRows[arm][col_name]

            col_name  = featureName +'_minor_used_after'
            armsRows[arm][col_name] = armsTables[arm][col_name].count(True)
            # print arm, col_name, armsRows[arm][col_name]
           

            col_name  = featureName +'_reaction_used'
            armsRows[arm][col_name] = armsTables[arm][col_name].count(True)
            # print arm, col_name, armsRows[arm][col_name]

            col_name  = featureName +'_addon_ignored'
            armsRows[arm][col_name] = armsTables[arm][col_name].count(True)
            # print arm, col_name, armsRows[arm][col_name]

    printArmsRows(armsRows)



def printArmsRows(armsRows):
  printHeader(ARMS_ROWS_KEYS_ARR)

  for arm in armsRows:
    printRow(armsRows[arm], ARMS_ROWS_KEYS_ARR)

def printHeader(keysArr):
    print '\t'.join(keysArr)

def printRow(rowDict, keysArr):

    rowStr = ""
    
    for key in keysArr:
        elm = rowDict.get(key)
        rowStr += json.dumps(elm) + '\t'

    print rowStr

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
