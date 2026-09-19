#!/bin/sh
# deb/rpm post-install: expose the vegaoffice command line shipped inside the app.
set -e
launcher="/opt/VegaOffice/resources/cli/vegaoffice"
if [ -x "$launcher" ]; then
  ln -sf "$launcher" /usr/bin/vegaoffice
fi
exit 0
