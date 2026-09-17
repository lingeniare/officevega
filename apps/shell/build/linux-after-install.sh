#!/bin/sh
# deb/rpm post-install: expose the getoffice command line shipped inside the app.
set -e
launcher="/opt/GetOffice/resources/cli/getoffice"
if [ -x "$launcher" ]; then
  ln -sf "$launcher" /usr/bin/getoffice
fi
exit 0
