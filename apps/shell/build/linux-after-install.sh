#!/bin/sh
# deb/rpm post-install: expose the officevega command line shipped inside the app.
set -e
launcher="/opt/OfficeVega/resources/cli/officevega"
if [ -x "$launcher" ]; then
  ln -sf "$launcher" /usr/bin/officevega
fi
exit 0
