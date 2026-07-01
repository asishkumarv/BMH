from PIL import Image

def flatten_to_white(img_path):
    im = Image.open(img_path)
    if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
        im = im.convert('RGBA')
        bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
        bg.paste(im, (0, 0), im)
        bg.save(img_path)
    else:
        # If no alpha channel, just make sure there's no transparent pixels
        pass

files = ['./assets/images/android-icon-foreground.png', './assets/Logo.png']
for f in files:
    try:
        flatten_to_white(f)
        print(f"Flattened {f} to solid white background")
    except Exception as e:
        print(f"Failed on {f}: {e}")
