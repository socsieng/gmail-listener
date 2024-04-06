#!/usr/bin/env bash

set -e

# load .env variables if they exist
if [ -f .env ]
then
  set -o allexport
  source .env
  set +o allexport
fi

cwd=`pwd`
script_folder=`cd $(dirname $0) && pwd`

required_environment_variables=("CLIENT_ID" "CLIENT_SECRET")

any_missing=0
for variable in "${required_environment_variables[@]}"
do
  val=`echo "${!variable}"`
  if [ -z "$val" ]
  then
    echo "$variable environment variable not present."
    any_missing=1
  fi
done

if [[ $any_missing -ne 0 ]]
then
  exit 1
fi

node $script_folder/get-refresh-token.js
