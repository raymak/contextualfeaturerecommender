
from logset import LogSet
import json_utils

class UserLogSet(LogSet):
    def __init__(self, input=None):

        super(UserLogSet, self).__init__()

        if not input: return

        self.info_set = False

        if type(input) is LogSet:
            if len(input.users) > 1:
                raise TypeError("userid needs to be unique.")

        for l in input:
            self.add(l)
            

    def __getitem__(self, k):
        return super(UserLogSet, self).__getitem__((self.userid, k))

    def __iter__(self):
        sorted_records = sorted(self.records)

        for k in sorted_records:
            yield self.__getitem__(k)

    def __contains__(self, k):
        return super(UserLogSet, self).__contains__((self.userid, k))

    def add(self, v):
        if type(v) is str:
            self.add_object(json_utils.json_loads_byteified(v))
        else:
            self.add_object(v)

    def add_object(self, obj):
        super(UserLogSet, self).add_object(obj)

        if (not self.info_set):
            self.set_info(obj)

        if obj["userid"] != self.userid:
            raise TypeError("userid needs to be unique.")


    def set_info(self, obj):
        fields = ['name', 'userid', 'startTimeMs', 'is_test', 'startLocaleTime', 'mode', 'locale']  #TODO: add addon_id

        for f in fields:
            setattr(self, f, obj[f])

        self.info_set = True

    def get_bounds(self):
        sorted_records = sorted(self.records)

        return (sorted_records[0][1], sorted_records[-1][1])

    def last(self):
        sorted_records = sorted(self.records)

        return sorted_records[-1]

    def first(self):
        sorted_records = sorted(self.records)

        return sorted_records[0]

    def type(self, t):
        return self.filter(lambda x: x["type"] == t)

    def filter(self, fn):
        return UserLogSet(x for x in self.records.values() if fn(x))


