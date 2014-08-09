#!/usr/bin/python

import fileinput
import json
import csv
from collections import defaultdict

def main():
    messagesDict = getMessagesByUserIds(basicFilter(parseMessages()))
    
    userIds = messagesDict.keys()
    print "Number of Users:", len(userIds)

    print hasUserSeenRecommendation(messagesDict, userIds[17], 'blushypage')





# returns an array of parsed messages
def parseMessages():
    fields = [u'experiment',
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

    messages = []

    for line in fileinput.input():
        
        id, payload = line.split("\t",1)
        payload = json.loads(json.loads(payload)["dp"])
        entry = {}
        for f in fields:
            entry[f] = payload[f]
        messages.append(entry)

    return messages




# returns a dictionary with the userid as its key and the array of messages of
# a user as its value
def getMessagesByUserIds(messagesArr):
    messagesDict = defaultdict(list)

    for message in messagesArr:
        messagesDict[message['userid']].append(message)

    return messagesDict


# filters by: experiment version, test_mode
def basicFilter(messagesArr):

    messagesArr = [message for message in messagesArr 
        if message['experiment_version'] == "2.0.0"  # Experiment Version
        and message['test_mode'] == False   # Test Mode
        ]
    

    return messagesArr




def hasUserSeenRecommendation(messagesDict, userId, featurename):

    userMessagesArr = messagesDict[userId]

    for message in userMessagesArr:
        if message['triggerid'] == featurename and message['type'] == 'PANELSHOW': return True

    return False













if __name__ == "__main__":
    main()
