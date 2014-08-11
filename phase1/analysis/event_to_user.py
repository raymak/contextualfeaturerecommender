#!/usr/bin/python

# input: csv-formatted stream, with each line corresponding to the payload for a message
# output: csv-formatted stream, with each line corresponding to higher-level features for a specific user
# assumes the input messages from a specific user are contiguous    

import fileinput
import json
import csv
from collections import defaultdict

inds = {}

counter = 0


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
                'active_theme_id' 
] + [featureName + suffix for featureName in FEATURE_NAMES 
    for suffix in ['_recommended',
     '_secondary_used_after',
      '_secondary_used_before',
       '_minor_used_after']
       ]



def main():
    # print inds
    printHeader()
    parseMessages()
    



# returns an array of parsed messages
def parseMessages():
    fieldsnames = [u'experiment',
        u'addon_version', 
        u'test_mode', 
        u'locale', 
        u'experiment_version', 
        u'systemversion', 
        u'os',
        u'systemname',
        u'userid',  
        u'arm',
        u'ts',
        u'type', u'value',   u'triggerid']

    
    currUserId = None
    userMessages = []


    for line in fileinput.input():   
        if fileinput.isfirstline():
            fields = line.strip().split('\t')
            
            for i in range(len(fields)):
                inds[fields[i]] = i
                

        else: 
            jsonrow = [json.loads(val) for val in line.split('\t')]
            
            userId = jsonrow[inds['userid']]
            currUserId = currUserId or userId

            if userId != currUserId:
                processUser(userMessages, currUserId)
                currUserId = userId
                userMessages = []

            userMessages.append(jsonrow)

    processUser(userMessages, currUserId)   # last line 



def processUser(userMessagesArr, userId):
    
    record = {}

    record['userid'] = userId

    # common fields
    firstMessage = userMessagesArr[0]
    record['experiment_name'] = firstMessage[inds['experiment']]
    record['addon_ver'] = firstMessage[inds['addon_version']]
    record['test_mode_enabled'] = firstMessage[inds['test_mode']]
    record['experiment_ver'] = firstMessage[inds['experiment_version']]
    record['locale'] = firstMessage[inds['locale']]
    record['system_name'] = firstMessage[inds['systemname']]
    record['system_ver'] = firstMessage[inds['systemversion']]
    record['os'] = firstMessage[inds['os']]
    
    ##arm
    armDict = firstMessage[inds['arm']]
    if armDict == {'basis': 'contextual', 'explanation': 'explained', 'ui': 'doorhanger-active'}:
        record['arm_name'] = 'explained-doorhanger-active'
    elif armDict == {'basis': 'contextual', 'explanation': 'explained', 'ui': 'doorhanger-passive'}:
        record['arm_name'] = 'explained-doorhanger-passive'
    elif armDict == {'basis': 'contextual', 'explanation': 'unexplained', 'ui': 'doorhanger-active'}:
        record['arm_name'] = 'unexplained-doorhanger-active'
    elif armDict == {'basis': 'contextual', 'explanation': 'unexplained', 'ui': 'doorhanger-passive'}:
        record['arm_name'] = 'unexplained-doorhanger-passive'
    elif armDict == {'basis': 'contextual', 'explanation': 'explained', 'ui': 'none'}:
        record['arm_name'] = 'control'


    # first run
    try:
        value = getMessagesByType(userMessagesArr, 'INSTALL')[0][inds['value']]

        record['num_of_extensions'] = value['addontypes'].count('extension')
        record['DNT_enabled'] = value['isdntenabled']
        record['history_enabled'] = value['ishistoryenabled']
        record['browsertabsremote_enabled'] = value['browsertabsremote']
        record['expstarttime_ms'] = value['expStartTimeMs']
        #activity
        record['theme_changed'] = (value['activeThemeName'] != 'Default')
        record['active_theme_name'] = value['activeThemeName']
        record['active_theme_id'] = value['activeThemeId']

    except IndexError:
        #TODO: filter the user
        pass


    # for each feature
    for featureName in FEATURE_NAMES:

        # get only the messsages related to this feature
        featMessagesArr = getMessagesByTriggerId(userMessagesArr, featureName)

        # if user has been recommended the feature
        record[featureName + '_recommended'] = hasUserSeenRecommendation(featMessagesArr, featureName)

        # if secondary listeners have been triggered before and after recommendation
        record[featureName + '_secondary_used_after'] = len(getMessagesByPropertyInValue(
            getMessagesByType(featMessagesArr, 'SECONDARYLISTENER'),
            'recommended',
            True)) > 0

        record[featureName + '_secondary_used_before'] = len(
            getMessagesByPropertyInValue(getMessagesByType(
            featMessagesArr, 'SECONDARYLISTENER'),
            'recommended',
            False)) > 0

        # number of minor triggers after recommendation
        record[featureName + '_minor_used_after'] = len(getMessagesByPropertyInValue(
            getMessagesByType(featMessagesArr, 'MINORTRIGGER'), 
            'isrecommended',
            True)) > 0

    printRow(record)   

def printHeader():
    print '\t'.join(RECORD_KEYS_ARR)

def printRow(rowDict):

    rowStr = ""
    
    for key in RECORD_KEYS_ARR:
        elm = rowDict.get(key)
        rowStr += json.dumps(elm) + '\t'

    print rowStr



def getMessagesByType(messagesArr, type):

    result = [message for message in messagesArr 
        if message[inds['type']] == type]

    return result


def getMessagesByPropertyInValue(messagesArr, propName, propValue):

    result = [message for message in messagesArr 
        if message[inds['value']][propName] == propValue]

    return result

def getMessagesByTriggerId(messagesArr, triggerId):

    result = [message for message in messagesArr 
        if message[inds['triggerid']] == triggerId]

    return result




# filters by: experiment version, test_mode
def basicFilter(messagesArr):

    messagesArr = [message for message in messagesArr 
        if message['experiment_version'] == "2.0.0"  # Experiment Version
        and message['test_mode'] == False   # Test Mode
        ]
    

    return messagesArr

def count():
    global counter
    counter += 1


def hasUserSeenRecommendation(messagesArr, featureName):

    for message in messagesArr:
        if message[inds['triggerid']] == featureName and message[inds['type']] == 'PANELSHOW': return True
    return False




if __name__ == "__main__":
    main()
