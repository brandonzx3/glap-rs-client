cd $(dirname "$0")
if [ -z "$1" ]; then
	echo "Supply path to codec.fbs in glap-rs-server"
else
	flatc --ts $1
	if [ $? -eq 0 ]; then
		cat codec_generated.ts | sed "s/import \\* as flatbuffers from 'flatbuffers'/import {flatbuffers} from 'flatbuffers'/">src/codec.ts
		rm codec_generated.ts
	else
		exit 1
	fi
fi
