import os
from rembg import remove

files = ['learning_v3.jpg', 'discovery_v3.jpg', 'mentorship_v3.jpg']
dir_path = 'public/features/'

for f in files:
    in_path = os.path.join(dir_path, f)
    out_path = os.path.join(dir_path, f.replace('.jpg', '.png'))
    if os.path.exists(in_path):
        with open(in_path, 'rb') as i:
            input_data = i.read()
        output_data = remove(input_data)
        with open(out_path, 'wb') as o:
            o.write(output_data)
        print(f'Converted {f} to {out_path}')
    else:
        print(f'File {in_path} not found.')
