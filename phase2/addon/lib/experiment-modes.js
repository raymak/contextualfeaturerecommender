exports.modes = [
  {rateLimit: 'easy', moment: 'random', coeff: 1}, //0
  {rateLimit: 'easy', moment: 'random', coeff: 2}, //1
  {rateLimit: 'easy', moment: 'in-context', coeff: 1}, //2
  {rateLimit: 'easy', moment: 'in-context', coeff: 2}, //3
  {rateLimit: 'easy', moment: 'interruptible', coeff: 1}, //4
  {rateLimit: 'easy', moment: 'interruptible', coeff: 2}, //5
  {rateLimit: 'strict', moment  : 'random', coeff: 1}, //6
  {rateLimit: 'strict', moment: 'random', coeff: 2}, //7
  {rateLimit: 'strict', moment: 'in-context', coeff: 1}, //8
  {rateLimit: 'strict', moment: 'in-context', coeff: 2}, //9
  {rateLimit: 'strict', moment: 'interruptible', coeff: 1}, //10
  {rateLimit: 'strict', moment: 'interruptible', coeff: 2} //11
]

exports.quickCodes = {
  "er1": 0,
  "er2": 1,
  "ec1": 2,
  "ec2": 3,
  "ei1": 4,
  "ei2": 5,
  "sr1": 6,
  "sr2": 7,
  "sc1": 8,
  "sc2": 9,
  "si1": 10,
  "si2": 11
}