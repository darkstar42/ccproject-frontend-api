#!/bin/bash

if [[ $TRAVIS_BRANCH == 'production' ]]; then
    rm -Rf /tmp/deploy
    mkdir -p /tmp/deploy/opt/ccproject-frontend-api
    cp -pR ./* /tmp/deploy/opt/ccproject-frontend-api
    mkdir -p /tmp/deploy/etc/init.d/
    cp .travis/ccproject-frontend-api /tmp/deploy/etc/init.d/ccproject-frontend-api
    chmod +x /tmp/deploy/etc/init.d/ccproject-frontend-api
    rm -f *.deb
    fpm -s dir -t deb -C /tmp/deploy --name ccproject-frontend-api --version 0.0.1 --iteration build-$TRAVIS_BUILD_NUMBER .

    scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null *.deb deployment@puppet.cc.gernox.de:/tmp/
fi
