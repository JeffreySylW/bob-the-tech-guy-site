# Builds dist/brand/photos/gaming-rig-cutout.webp from the original of media 32885 (custom-gaming-rig_all-white_main2.jpg, 2428x1872).
# Hand-traced outline (rembg models did badly on this photo); the clear glass front stays faintly visible; the edges the photo frame
# cut off (right side, top-left corner) fade out. Usage: python -I tools/rig-cutout.py <original.jpg> <out.webp> fade
import sys
from PIL import Image, ImageOps, ImageDraw, ImageFilter, ImageChops
src,out,mode=sys.argv[1],sys.argv[2],sys.argv[3]
im=ImageOps.exif_transpose(Image.open(src)).convert('RGB'); W,H=im.size
m=Image.new('L',(W,H),0); d=ImageDraw.Draw(m)
# body: bottom edge lifted a little so no mat shows under the base
body=[(0,92),(2428,165),(2428,420),(1990,470),(1960,624),(1880,1092),(1820,1404),(1860,1720),(1830,1790),(1770,1798),(540,1758),(490,1730),(470,1700),(420,1450),(372,1250),(305,1000),(165,600),(45,300),(0,190)]
if mode=='fade':
    glass=[(1990,470),(2428,420),(1850,1800),(1830,1790),(1860,1720),(1820,1404),(1880,1092),(1960,624)]
    d.polygon(glass,fill=46); d.line([(2428,428),(1850,1800)],fill=210,width=16)
    d.polygon(body,fill=255)
    # fade out the edges the photo frame cut off: right side (top bar end + glass) and the top-left corner
    g=Image.new('L',(W,H),255); gd=ImageDraw.Draw(g)
    for x in range(1980,W): gd.line([(x,0),(x,H)],fill=int(255*max(0,1-(x-1980)/(W-1980))**1.4))
    for x in range(0,180): gd.line([(x,0),(x,420)],fill=int(255*(x/180)))
    m=ImageChops.multiply(m,g)
else: # tight: case body only, top bar cut where the body ends, no glass
    body=[(0,92),(2000,150),(2000,470),(1960,624),(1880,1092),(1820,1404),(1860,1720),(1830,1790),(1770,1798),(540,1758),(490,1730),(470,1700),(420,1450),(372,1250),(305,1000),(165,600),(45,300),(0,190)]
    d.polygon(body,fill=255)
    g=Image.new('L',(W,H),255); gd=ImageDraw.Draw(g)
    for x in range(0,180): gd.line([(x,0),(x,420)],fill=int(255*(x/180)))
    for x in range(1880,2000): gd.line([(x,0),(x,480)],fill=int(255*(1-(x-1880)/120)))
    m=ImageChops.multiply(m,g)
m=m.filter(ImageFilter.GaussianBlur(2.2))
rgba=im.convert('RGBA'); rgba.putalpha(m); rgba=rgba.crop(m.getbbox())
rgba=rgba.resize((720,round(rgba.height*720/rgba.width)),Image.LANCZOS)
rgba.save(out,'WEBP',quality=80,method=6); print(out,rgba.size)
