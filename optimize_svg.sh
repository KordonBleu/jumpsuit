#!/bin/sh

function optimize {
	tmpfile=$(printf "%s.tmp" $1)
	scour -i $1 -o $tmpfile --remove-metadata --shorten-ids --enable-comment-stripping --enable-id-stripping --indent=tab
	mv $tmpfile $1
}

if [ -z $@ ]; then
	arglist=$(pwd)
else
	arglist=$@
fi

for arg in $arglist; do
	if [ -d $arg ]; then
		for file in $arg/*; do
			if [ $(file -b --mime-type "$file") = 'image/svg+xml' ]; then
				optimize $file
			fi
		done
	elif [ -f $arg ]; then
		optimize $arg
	else
		echo "$arg is not a directory" >&2
		dir=$1
	fi
done
