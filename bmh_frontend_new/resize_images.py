from PIL import Image

def make_square(im, min_size=812, fill_color=(255, 255, 255, 0)):
    x, y = im.size
    size = max(min_size, x, y)
    new_im = Image.new('RGBA', (size, size), fill_color)
    new_im.paste(im, (int((size - x) / 2), int((size - y) / 2)))
    return new_im

files = ['./assets/images/android-icon-foreground.png', './assets/Logo.png']
for file in files:
    try:
        im = Image.open(file)
        sq = make_square(im)
        sq.save(file)
        print(f"Successfully squared {file}")
    except Exception as e:
        print(f"Failed on {file}: {e}")
