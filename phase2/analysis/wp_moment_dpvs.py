import numpy
from functools import partial

moment_types = {
                'tnra20m_nt': 'tab-new-recently-active20m-no-tab',
                'tnra10s': 'tab-new-recently-active10s',
                'window_open': 'window-open',
                'athp': 'active-tab-hostname-progress',
                'startup': 'startup'
                }

def m_rates(m_short, up):
    rates = list(filter(lambda x: not isinstance(x, str), up.log_set.type('MOMENT_REPORT') \
        .filter(lambda x: x['attrs']['moment'] == moment_types[m_short]) \
        .last()['attrs']['rates']))


    return rates

def m_count(m_short, up):
    return len(m_rates(m_short, up))

def m_mean(m_short, up):
    rates = m_rates(m_short, up)

    if len(rates) == 0 : return None

    return numpy.median(numpy.array(rates))

exports = {k:v  for m_short in moment_types for k,v in { 
                            'n_%s' % m_short: partial(m_count, m_short),
                            'med_%s' % m_short: partial(m_mean, m_short)
                            }.items()
            }

# equivalent to 

# n_tnra20m_nt = partial(m_count, 'tnra20m_nt')
# med_tnra20m_nt = partial(m_mean, 'tnra20m_nt')

# n_tnra10s = partial(m_count, 'tnra10s')
# med_tnra10s = partial(m_mean, 'tnra10s')

# n_window_open = partial(m_count, 'window_open')
# med_window_open = partial(m_mean, 'window_open')

# n_athp = partial(m_count, 'athp')
# med_athp = partial(m_mean, 'athp')

# n_startup = partial(m_count, 'startup')
# med_startup = partial(m_mean, 'startup')

