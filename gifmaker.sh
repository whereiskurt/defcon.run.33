#!/bin/bash

#Takes a movie file as $INPUT and then outputs a gif
ffmpeg -i $INPUT -vf "fps=15,scale=800:-1:flags=lanczos,palettegen" $INPUT.palette.png && \
    ffmpeg -i $INPUT -i $INPUT.palette.png -filter_complex "fps=15,scale=800:-1:flags=lanczos[x];[x][1:v]paletteuse" $INPUT.output.gif && \
    gifsicle -O3 --colors 256 $INPUT.output.gif -o $INPUT.output-optimized.gif