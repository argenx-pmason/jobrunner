data jobs ;
   length path $200 ;
   input path ;
   cards4 ;
/general/biostat/jobs/gadam_ongoing_studies/dev/jobs/sdtm_last_part1_check_studies.job"
/general/biostat/jobs/utils/dev/jobs/study_people.job
;;;;
run ;
filename outjson "&_sasws_/Users/pmason/input/myjobs.json";
proc json out=outjson pretty nosastags ;
   export jobs ;
run ;