"""
    contains different integrity tests for one single user's log data
"""

from userlogset import UserLogSet
from userprofile import UserProfile

BASIC_TESTS = ['message_missing', 'first_run', 'proper_ending', 'user_disable', 'warning', 'error', 'headless_error', 'headless_warning']

def check(inp):
    """
        Given a UserProfile or a UserLogSet object, runs its log data through various integrity tests and returns a list containing
            the results as UserIntegrityReport objects.
    """

    if isinstance(inp, UserLogSet):
        log_set = inp
    else:
        log_set = inp.log_set

    reports = []

    for test in BASIC_TESTS:
        reports.append(globals()[test](log_set))

    return reports


class UserIntegrityReport:
    def __init__(self, name, messages, data, passed):
        self.name = name
        self.messages = messages
        self.data = data
        self.passed = passed


# Integrity Test Functions

def message_missing(log_set):
    first, last = log_set.get_bounds()

    count = len(log_set)

    n = 'message_missing'
    fail_m = "start: %d, end: %d, count: %d" % (first, last, count) + "\n %d message(s) missing " % (last-count)
    pass_m = "start: %d, end: %d, count: %d" % (first, last, count)
    m = [pass_m, fail_m]
    d = {'start': first, 'end': last, 'count': count, 'missing': last - count}

    p = d['missing'] == 0

    if not p:
        missing_numbers = []
        for i in range(1, (last+1)):
            if i not in log_set:
                missing_numbers.append(i)
        d['missing_numbers'] = missing_numbers

    return UserIntegrityReport(n, m, d, p)

def first_run(log_set):

    n = "first_run_missing"
    fail_m = "FIRST_RUN message missing"
    pass_m = None
    m = [pass_m, fail_m]
    d = None

    p = (1 in log_set) and (log_set[1]['type'] == 'FIRST_RUN')

    return UserIntegrityReport(n, m, d, p)

def proper_ending(log_set):

    n = "proper_ending"
    fail_m = "no proper end flag found"
    pass_m = None
    m = [pass_m, fail_m]
    d = None

    first,last = log_set.get_bounds()
    lm = log_set[last]

    p =     ( 
            lm['type'] == 'SELF_DESTRUCT' or
            lm['type'] == 'UNLOAD' and lm['attrs']['reason'] == 'disable' or
            lm['type'] == 'UNLOAD' and lm['attrs']['reason'] == 'uninstall' or
            lm['type'] == 'DISABLE' and lm['attrs']['reason'] == 'uninstall' or
            not log_set.type("EXP_STAGE_ADVANCE").is_empty() and log_set.type("EXP_STAGE_ADVANCE").last()['attrs']['newstage'] == 'end'
            )

    return UserIntegrityReport(n, m , d, p)

def user_disable(log_set):

    n = "user_disable"
    fail_m = "disabled by user"
    pass_m = None
    m = [pass_m, fail_m]
    d = None

    first, last = log_set.get_bounds()
    lm = log_set[last]

    p =     (
            log_set[last]['type'] == 'SELF_DESTRUCT' or
            log_set[last-1]['type'] == 'SELF_DESTRUCT' or
            log_set[last-2]['type'] == 'SELF_DESTRUCT'
            ) or not (
            lm['type'] == 'UNLOAD' and lm['attrs']['reason'] == 'disable' or
            lm['type'] == 'UNLOAD' and lm['attrs']['reason'] == 'uninstall' or
            lm['type'] == 'DISABLE' and lm['attrs']['reason'] == 'uninstall' or
            lm['type'] == 'DISABLE' and lm['attrs']['reason'] == 'disable'
            )

    return UserIntegrityReport(n, m, d, p)


def warning(log_set):

    n = "warning"
    ls = log_set.type("WARNING")
    c = len(ls)
    fail_m = "%d warning(s)" % c
    pass_m = None
    m = [pass_m, fail_m]

    p = c == 0

    d = {'count': c, 'log_set': ls}

    return UserIntegrityReport(n, m , d, p)

def error(log_set):

    n = "error"
    ls = log_set.type("ERROR")
    c = len(ls)
    fail_m = "%d error(s)" % c
    pass_m = None 
    m = [pass_m, fail_m]

    p = c == 0

    d = {'count': c, 'log_set': ls}

    return UserIntegrityReport(n, m ,d, p)

def headless_error(log_set):

    n = "headless_error"
    l = list(filter(lambda x: x['type'] == "HEADLESS_ERROR", log_set.get_headless_records()))
    c = len(l)
    fail_m = "%d headless error(s)" % c
    pass_m = None
    m = [pass_m, fail_m]

    p = c == 0

    d = {'count': c, 'list': l}

    return UserIntegrityReport(n, m ,d, p)

def headless_warning(log_set):

    n = "headless_warning"
    l = list(filter(lambda x: x['type'] == "HEADLESS_WARNING", log_set.get_headless_records()))
    c = len(l)
    fail_m = "%d headless warning(s)" % c
    pass_m = None
    m = [pass_m, fail_m]

    p = c == 0

    d = {'count': c, 'list': l}

    return UserIntegrityReport(n, m ,d, p)







