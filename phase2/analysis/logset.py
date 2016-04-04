import json_utils

class LogSet(object):
    def __init__(self, input=None):
        self.records = {}
        self.users = set()

        if input:
            for l in input:
                self.add(l)
            

    def __getitem__(self, k):
        return self.records[k]

    def __len__(self):
        return len(self.records)

    def __iter__(self):
        for k in self.records:
            yield self.__getitem__(k)

    def __contains__(self, k):
        return self.records.__contains__(k)

    def user(self, id):
        if id not in self.users:
            raise TypeError('userid ' + id + ' does not exist in set.')

        return (self.records[k] for k in self.records.keys() if k[0] == id) 

    def add(self, v):
        if type(v) is str:
            self.add_object(json_utils.json_loads_byteified(v))
        else:
            self.add_object(v)

    def add_object(self, obj):
        if not("number" in obj or "userid" in obj):
            raise TypeError("'number' or 'userid' field was not found.")
            
        self.records[(obj["userid"], obj["number"])] = obj
        self.users.add(obj["userid"])


    def filter(self, fn):
        return LogSet(x for x in self.records.values() if fn(x))