

class JSet(list):
    def __init__(self, ls):
        super(JSet, self).__init__(ls)

    def filter(self, fn):
        return JSet([elm for elm in self if fn(elm)])