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

FEATURE_SUFFIXES = [
    '_recommended',
     '_recommended_seen',
      '_secondary_used_after',
       '_secondary_used_before',
        '_minor_used_after',
         '_reaction_used',
          '_addon_ignored']

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
          'arm_basis',
           'arm_explanation',
            'arm_ui', 
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
    for suffix in FEATURE_SUFFIXES
       ]




def main(headerLine, messageLines):

    inds = parseHeader(headerLine)

    printHeader()
    for (messages, userId) in parseMessages(messageLines, inds):
        printRow(processUser(messages, userId)) 
    

def parseHeader(line):

    fields = line.strip().split('\t')
            
    for i in range(len(fields)):
        inds[fields[i]] = i

    return inds


# returns an array of parsed messages
def parseMessages(lines, inds):

    
    currUserId = None
    userMessages = []

    for line in lines:   
        try:

            jsonrow = [json.loads(val) for val in line.strip().split('\t')]
            
            userId = jsonrow[inds['userid']]
            currUserId = currUserId or userId

        except IndexError:
            print jsonrow


        if userId != currUserId:
            yield (userMessages, currUserId)
            currUserId = userId
            userMessages = []

        userMessages.append(jsonrow)

    yield (userMessages, currUserId)   # last line 



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

    #uninstalling and disabling
    record['has_disabled'] = len(getMessagesByPropertyInValue(
            getMessagesByType(userMessagesArr, 'LASTCALL'), 
            'reason',
            'disable')) > 0
    record['has_moved_button'] = len(getMessagesByPropertyInValue(
            getMessagesByType(userMessagesArr, 'LASTCALL'), 
            'reason',
            'button moved')) > 0
    
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

    record['arm_basis'] = armDict['basis']
    record['arm_explanation'] = armDict['explanation']
    record['arm_ui'] = armDict['ui']


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

    total_recommendations = 0

    # for each feature
    for featureName in FEATURE_NAMES:

        # get only the messsages related to this feature
        featMessagesArr = getMessagesByTriggerId(userMessagesArr, featureName)

        # if user has received recommendation
        record[featureName + '_recommended'] = hasUserReceivedRecommendation(featMessagesArr, featureName)

        total_recommendations += int(record[featureName + '_recommended'])

        # if user has been recommended the feature
        record[featureName + '_recommended_seen'] = hasUserSeenRecommendation(featMessagesArr, featureName)

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

        # number of direct reactions (clicking the button)
        record[featureName + '_reaction_used'] = len(
            getMessagesByType(featMessagesArr, 'REACTION')
            ) > 0

        #any ignored addon recommendations
        record[featureName + '_addon_ignored'] = len(getOfferingMessagesByType(
            getMessagesByType(featMessagesArr, 'OFFERING'),
        'ADDON_IGNORED')) > 0

    # total recommendations received
    record['total_recommendations'] = total_recommendations

    # print record

    return record  

def printHeader():
    print '\t'.join(RECORD_KEYS_ARR)

def printRow(rowDict):

    elms = [json.dumps(rowDict.get(key))
             for key in RECORD_KEYS_ARR]
    rowStr = '\t'.join(elms)

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

# a special case of getMessagesByPropertyInValue, had to do this because of 
# https://github.com/raymak/contextualfeaturerecommender/issues/202
def getOfferingMessagesByType(messagesArr,  offeringType):

    if offeringType == 'NEWWINDOW':
        result = [message for message in messagesArr 
            if not 'offeringType' in message[inds['value']]]
    else:
        result = [message for message in messagesArr 
            if 'offeringType' in message[inds['value']] and message[inds['value']]['offeringType'] == offeringType]


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

def hasUserReceivedRecommendation(messagesArr, featureName):

    for message in messagesArr:
        if message[inds['triggerid']] == featureName and message[inds['type']] == 'OFFERING': return True
    
    return False


def hasUserSeenRecommendation(messagesArr, featureName):

    for message in messagesArr:
        if message[inds['triggerid']] == featureName and message[inds['type']] == 'PANELSHOW': return True
    return False




if __name__ == "__main__":
    lines = fileinput.input()
    main(lines.next(), lines)
