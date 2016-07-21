from userlogset import UserLogSet

class UserProfile:
    def __init__(self, usr_log_set):

        self.log_set = usr_log_set  # passed by reference

        self.set_info()

        self.dpvs = {}
        self.ipvs = {}

        self.condition = mode_to_condition(self.mode)

        self.integrity_reports = {}

    def set_info(self):
        """
            Uses the log set meta info_set for the user profile.
        """

        self.meta_info = self.log_set.meta_info

        for f in self.meta_info:
            setattr(self, f, self.meta_info[f])

        self.info_set = True

    def add_dpv(self, dpv_name, eval_func):
        """
            the eval_func could return a single value or a dictionary of key,value pairs
        """

        val = eval_func(self)

        self.dpvs[dpv_name] = val if type(val) == dict else {dpv_name: val}

    def add_ipv(self, ipv_name, eval_func):
        """
            similar to add_dpv
        """

        val = eval_func(self)

        self.ipvs[ipv_name] = val if type(val) == dict else {ipv_name: val}

    def  check_integrity(self, fn):
        reports = fn(self)

        for r in reports:
            self.add_integrity_report(r.name, r)

    def add_integrity_report(self, name, report):
        self.integrity_reports[name] = report



def mode_to_condition(mode):
    rate_limit = 'e' if mode['rateLimit'] == 'easy' else 's'

    if mode['moment'] == 'random':
        moment = 'r'
    elif mode['moment'] == 'in-context':
        moment = 'c'
    else:
        moment = 'i'

    coeff = str(mode['coeff'])

    return rate_limit + moment + coeff