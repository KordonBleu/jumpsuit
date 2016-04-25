#!/bin/sh

display_help() {
	echo $0 '[-r] [-h] [FILE]...'
	echo 'Optimizes SVGs and PNGs FILEs. If FILE is a directory, optimizes all SVGs and PNGs in this directory.'
	echo '  -r    recursive'
	echo '  -h    display this help'
}

optimize_file() {
	mime=$(file -b --mime-type $1)
	case $mime in
		'image/svg+xml')
			optimize_svg $1
			;;
		'image/png')
			optipng -o7 -zm1-9 $1
	esac
}

optimize_svg() {
	tmpfile=$(printf "%s.tmp" $1)
	scour -i $1 -o $tmpfile --remove-metadata --shorten-ids --enable-comment-stripping --enable-id-stripping --indent=none --no-line-breaks --strip-xml-space --no-renderer-workaround
	mv $tmpfile $1
}

recursive() {
	for arg in $@; do
		if [ -d "$arg" -a \( "$recursive" -o "$depth" -le 1 \) ]; then
			depth=$((depth+1))
			recursive $arg/*
			depth=$((depth-1))
		elif [ -f $arg ]; then
			optimize_file $arg
		else
			echo "$arg is neither a file nor a directory" >&2
		fi
	done
}

if [ ! $(command -v scour) ]; then
	echo 'Please install scour'
	exit 1
elif [ ! $(command -v optipng) ]; then
	echo 'Please install optipng'
	exit 1
fi


while getopts :rh opt; do
	case $opt in
		r)
			recursive=true
			shift
			;;
		h)
			display_help
			exit 0
			;;
		?)
			echo 'Invalid option' >&2
			display_help
			exit 1
	esac
done

arglist=$@ #for some reason [ -z "$@" ] is buggy
if [ -z "$arglist" ]; then
	arglist=$(pwd)
fi

echo $arglist
depth=0
recursive $arglist
