""" 
Common analysis tools that can be used in analysis code.

"""


import os
from userprofile import UserProfile
from userlogset import UserLogSet

def traverse_dirs(rootDir, exts=['jsonl']):
    """
        Generates the names of the files with a certain extension in a given rootDir and its subdirectories.
        If exts == '*' all file extensions are included.
    """

    for root, dirs, files in os.walk(rootDir):
        for name in files:
            ext = os.path.splitext(name)[1]
            fExt = ext[1:]  # removes the . from the extension
            if  (fExt == exts or
                isinstance(exts, list) and fExt in exts or
                exts == '*'):
                
                file_name = os.path.join(root, name)
                yield file_name

def user_profile_from_file(file_name):
    """
        Creates and returns a UserProfile object from a jsonl file that contains data for only 1 user.
    """

    with open(file_name, 'r') as f:

        jsonl_list = [s for s in f.readlines()]

        log_set = UserLogSet(jsonl_list)

        return UserProfile(log_set)