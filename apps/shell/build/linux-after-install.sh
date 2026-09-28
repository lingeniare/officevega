#!/bin/sh
# deb/rpm post-install: expose the officevega command line shipped inside the app.
# Only an absent name, a dead link or a link into our own install dir is taken
# over; anything else at /usr/bin/officevega belongs to another program (officevega#893).
set -e
launcher="/opt/OfficeVega/resources/cli/officevega"
link="/usr/bin/officevega"
[ -x "$launcher" ] || exit 0
if [ -L "$link" ]; then
  case "$(readlink "$link")" in
    /opt/OfficeVega/*) ;;
    *) [ -e "$link" ] && { echo "officevega: $link is another program, left as is; run: ln -s $launcher $link" >&2; exit 0; } ;;
  esac
elif [ -e "$link" ]; then
  echo "officevega: $link is another program, left as is; run: ln -s $launcher $link" >&2
  exit 0
fi
ln -sfn "$launcher" "$link"
exit 0
