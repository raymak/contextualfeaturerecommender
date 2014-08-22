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

FEATURE_SUFFIXES = [
    '_recommended',
     '_recommended_seen',
      '_secondary_used_after',
       '_secondary_used_only_after',
        '_secondary_used_after_to_seen',
         '_secondary_used_after_seen',
          '_secondary_used',        
           '_secondary_used_after_seen_to_seen',
            '_secondary_used_before',
             '_minor_used_after',
              '_reaction_used',
               '_reaction_used_after_seen',
                '_reaction_used_after_seen_to_seen',
                 '_addon_ignored']

FEATURE_OFFERING_TYPES = {
    'closetabshortcut': 'KEYSHORTCUT',
     'newbookmark': 'ADDON',
      'newtabshortcut': 'KEYSHORTCUT',
       'newbookmarkshortcut': 'KEYSHORTCUT',
        'blushypage': 'PRIVATEWINDOW',
         'facebook': 'PINTAB',
          'amazon': 'ADDON',
           'youtube': 'ADDON',
            'download': 'ADDON',
             'gmail': 'ADDON',
              'reddit': 'ADDON'
}


ARMS_ROWS_KEYS_ARR = [
  'name', 
   'user_num',
    'has_disabled',
     'has_moved_button',
      'median_num_of_extensions',
       'median_total_recommendations' 
] + [featureName + suffix for featureName in FEATURE_NAMES
      for suffix in FEATURE_SUFFIXES]

ARMS_FEATURES_KEYS_ARR = [
    'ARM_arm_name',
     'ARM_basis',
      'ARM_explanation',
       'ARM_ui',
         'ARM_user_num',
          'ARM_has_disabled',
           'ARM_has_moved_button',
            'ARM_median_num_of_extensions',
             'ARM_median_total_recommendations',
               'FEATURE_feature_name',
                'FEATURE_offering_type'
] + ['FEATURE' + suffix for suffix in FEATURE_SUFFIXES]

ARM_NAMES = ['explained-doorhanger-active',
              'explained-doorhanger-passive',
               'unexplained-doorhanger-active',
                'unexplained-doorhanger-passive',
                 'control']

def main(headerLine, userLines): 

    table = parseCSVtoTable(headerLine, userLines)
    table = basicFilter(table)

    printTableToCSV(generateArmFeatureReport(table), ARMS_FEATURES_KEYS_ARR)


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



def appendRecordDictToTable(table, recordDict):

    for col_name in table:
        table[col_name].append(recordDict[col_name])

# mutates the given table
def generateArmFeatureReport(table):

    armsFeaturesTable = {armsFeaturesKey: [] for armsFeaturesKey in ARMS_FEATURES_KEYS_ARR}

    armsTables = {arm: {} for arm in ARM_NAMES}

    for arm in armsTables:
        armsTables[arm] = getTableByColumnValue(table, 'arm_name', arm)

    recordDict = {}

    for arm in ARM_NAMES:
      
        userNum = len(armsTables[arm]['userid'])
        recordDict['ARM_user_num'] = userNum
        recordDict['ARM_arm_name'] = arm
        recordDict['ARM_basis'] = armsTables[arm]['arm_basis'][0]
        recordDict['ARM_explanation'] = armsTables[arm]['arm_explanation'][0]
        recordDict['ARM_ui'] = armsTables[arm]['arm_ui'][0]
        recordDict['ARM_has_disabled'] =  armsTables[arm]['has_disabled'].count(True) 
        recordDict['ARM_has_moved_button'] = armsTables[arm]['has_moved_button'].count(True)
        recordDict['ARM_median_num_of_extensions'] = sorted(armsTables[arm]['num_of_extensions'])[userNum // 2]
        recordDict['ARM_median_total_recommendations'] = sorted(armsTables[arm]['total_recommendations'])[userNum //2]

        for featureName in FEATURE_NAMES:

            recordDict['FEATURE_feature_name'] = featureName
            recordDict['FEATURE_offering_type'] = FEATURE_OFFERING_TYPES[featureName]

            for featureSuffix in [
                    '_recommended',
                     '_recommended_seen',
                      '_secondary_used',
                       '_secondary_used_after',
                        '_secondary_used_before',
                         '_minor_used_after',
                          '_reaction_used',
                           '_addon_ignored']:

                col_name  = featureName + featureSuffix
                recordDict['FEATURE' + featureSuffix] = armsTables[arm][col_name].count(True)

            secondaryUsedAfter = recordDict['FEATURE' + '_secondary_used_after']
            recommendedSeen = recordDict['FEATURE' + '_recommended_seen']

            # 0 could mean real 0 or 0/0
            recordDict['FEATURE' + '_secondary_used_after_to_seen'] = 0 if recommendedSeen == 0 else (100* secondaryUsedAfter) / recommendedSeen
            recordDict['FEATURE' + '_secondary_used_only_after'] = [
                                    armsTables[arm][featureName + '_secondary_used_after'][i] 
                                    and not armsTables[arm][featureName + '_secondary_used_before'][i]
                                    for i in range(userNum)
                                    ].count(True)
            recordDict['FEATURE' + '_secondary_used_after_seen'] = [
                                    armsTables[arm][featureName + '_secondary_used_after'][i]
                                    and armsTables[arm][featureName + '_recommended_seen'][i]
                                    for i in range(userNum)
                                    ].count(True)
            secondaryUsedAfterSeen =  recordDict['FEATURE' + '_secondary_used_after_seen']
            recordDict['FEATURE' + '_secondary_used_after_seen_to_seen'] = 0 if recommendedSeen == 0 else (100 * secondaryUsedAfterSeen) / recommendedSeen
            recordDict['FEATURE' + '_reaction_used_after_seen'] = [
                                    armsTables[arm][featureName + '_reaction_used'][i]
                                    and armsTables[arm][featureName + '_recommended_seen'][i]
                                    for i in range(userNum)
                                    ].count(True)
            reactionUsedAfterSeen = recordDict['FEATURE' + '_reaction_used_after_seen']
            recordDict['FEATURE' + '_reaction_used_after_seen_to_seen'] = 0 if recommendedSeen == 0 else (100 * reactionUsedAfterSeen) / recommendedSeen



            appendRecordDictToTable(armsFeaturesTable, recordDict)


    return armsFeaturesTable
           


def printTableToCSV(table, columnNamesArr):
    printCSVTableHeader(columnNamesArr)

    rowNum = len(table[columnNamesArr[0]])

    for i in range(rowNum):
        printTableRow(table, i, columnNamesArr)


def printTableRow(table, rowNum, columnNamesArr):

    elms = [json.dumps(table[colName][rowNum])
             for colName in columnNamesArr]
    
    rowStr = '\t'.join(elms)
 
    print rowStr

def printCSVTableHeader(keysArr):
    print '\t'.join(keysArr)

def parseCSVtoTable(headerLine, rows):

    table = {}

    fields = headerLine.strip().split('\t')
            
    for i in range(len(fields)):
        table[fields[i]] = []
        rev_inds[i] = fields[i]

    for line in rows:  

        jsonrow = [json.loads(val) for val in line.strip().split('\t')]

        for i in range(len(jsonrow)):
            table[rev_inds[i]].append(jsonrow[i])
            
    return table


if __name__ == "__main__":
    lines = fileinput.input()
    main(lines.next(), lines)
