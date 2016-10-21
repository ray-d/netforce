#!/bin/bash
for mod in netforce*; do
    echo "installing $mod..."
    cd $mod
    ./setup.py develop
    cd ..
done

pip install https://bitbucket.org/whitie/python-barcode/get/tip.tar.gz
