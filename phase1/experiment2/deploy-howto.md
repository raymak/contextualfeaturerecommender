
1. Copy files in the directory to hg directory for testpilot web

  /testcases/featurerecommender

2. fabric:

  fab package:featurerecommender,,index.json
  fab test_valid:index.json
  fab push

3. Wait and profit?