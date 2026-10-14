import os
import math
from PIL import Image, ImageDraw

def render_memento_logo(size, is_foreground_only=False, is_round=False, bg_color='#38BDF8'):
    # Render at 4x supersampling for ultra smooth antialiased curves
    scale = 4
    canvas_size = size * scale
    img = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if not is_foreground_only:
        if is_round:
            draw.ellipse([0, 0, canvas_size - 1, canvas_size - 1], fill=bg_color)
        else:
            # Rounded squircle/rectangle icon
            corner_radius = int(canvas_size * 0.22)
            draw.rounded_rectangle([0, 0, canvas_size - 1, canvas_size - 1], radius=corner_radius, fill=bg_color)

    # Calculate camera dimensions
    # For foreground adaptive icon, safe zone is central 66%
    if is_foreground_only:
        center_x = canvas_size / 2
        center_y = canvas_size / 2
        cam_w = canvas_size * 0.52
        cam_h = cam_w * (18.5 / 25.0)
    else:
        center_x = canvas_size / 2
        center_y = canvas_size * 0.52
        cam_w = canvas_size * 0.62
        cam_h = cam_w * (18.5 / 25.0)

    cam_left = center_x - cam_w / 2
    cam_top = center_y - cam_h / 2 + (cam_h * 0.05)
    cam_right = cam_left + cam_w
    cam_bottom = cam_top + cam_h
    corner_r = int(cam_w * (4.5 / 25.0))
    stroke_w = max(int(cam_w * (1.8 / 25.0)), 2)

    # Shutter release button (red: #ef4444)
    # relative to chassis: x=7/25, y=5/25, w=4.5/25, h=2/25
    shutter_w = cam_w * (4.5 / 25.0)
    shutter_h = cam_h * (2.2 / 18.5)
    shutter_left = cam_left + cam_w * (3.5 / 25.0)
    shutter_top = cam_top - shutter_h * 0.75
    shutter_r = int(shutter_h * 0.45)
    draw.rounded_rectangle(
        [shutter_left, shutter_top, shutter_left + shutter_w, shutter_top + shutter_h],
        radius=shutter_r,
        fill='#EF4444'
    )

    # Camera chassis:
    # Outer white chassis rounded rect with stroke
    chassis_fill = '#FFFFFF' if is_foreground_only else '#FFFFFF'
    chassis_stroke = '#4B3F72' if is_foreground_only else '#372E54'
    draw.rounded_rectangle(
        [cam_left, cam_top, cam_right, cam_bottom],
        radius=corner_r,
        fill=chassis_fill,
        outline=chassis_stroke,
        width=max(stroke_w // 2, 1)
    )

    # Cute face elements inside chassis (color: #4B3F72)
    face_color = '#4B3F72'
    eye_stroke = max(int(stroke_w * 0.9), 2)

    # Left eye: ^ shape
    # SVG: M7.5 15.5 L9.5 12.8 L11.5 15.5
    # Normalize coords in chassis [0..25, 0..18.5]
    def to_canvas(cx, cy):
        rx = (cx - 3.5) / 25.0
        ry = (cy - 7.5) / 18.5
        return (cam_left + rx * cam_w, cam_top + ry * cam_h)

    p1 = to_canvas(7.5, 15.5)
    p2 = to_canvas(9.5, 12.8)
    p3 = to_canvas(11.5, 15.5)
    draw.line([p1, p2, p3], fill=face_color, width=eye_stroke, joint='round')

    # Right eye: ^ shape
    # SVG: M20.5 15.5 L22.5 12.8 L24.5 15.5
    p4 = to_canvas(20.5, 15.5)
    p5 = to_canvas(22.5, 12.8)
    p6 = to_canvas(24.5, 15.5)
    draw.line([p4, p5, p6], fill=face_color, width=eye_stroke, joint='round')

    # Smile mouth: ‿ curve
    # SVG: M13.5 19.2 Q16 22.2 18.5 19.2
    # Quadratic bezier curve
    sp1 = to_canvas(13.5, 18.8)
    ctrl = to_canvas(16.0, 22.2)
    sp2 = to_canvas(18.5, 18.8)

    smile_points = []
    steps = 30
    for i in range(steps + 1):
        t = i / steps
        # B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
        bx = (1 - t)**2 * sp1[0] + 2 * (1 - t) * t * ctrl[0] + t**2 * sp2[0]
        by = (1 - t)**2 * sp1[1] + 2 * (1 - t) * t * ctrl[1] + t**2 * sp2[1]
        smile_points.append((bx, by))

    draw.line(smile_points, fill=face_color, width=eye_stroke, joint='round')

    # Downsample using high quality Lanczos filter
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def render_splash(width, height):
    # Splash with brand background #191827 or #4B3F72
    bg_color = (25, 24, 39, 255) # #191827
    splash = Image.new('RGBA', (width, height), bg_color)

    # Center icon
    icon_size = min(int(min(width, height) * 0.38), 240)
    icon_img = render_memento_logo(icon_size, is_foreground_only=False, is_round=False, bg_color='#38BDF8')

    offset_x = (width - icon_size) // 2
    offset_y = (height - icon_size) // 2 - int(icon_size * 0.1)
    splash.paste(icon_img, (offset_x, offset_y), icon_img)

    return splash

def main():
    res_dir = 'android/app/src/main/res'

    # Launcher icons
    densities = {
        'mdpi': (48, 108),
        'hdpi': (72, 162),
        'xhdpi': (96, 216),
        'xxhdpi': (144, 324),
        'xxxhdpi': (192, 432),
    }

    for dens, (icon_sz, fg_sz) in densities.items():
        folder = os.path.join(res_dir, f'mipmap-{dens}')
        os.makedirs(folder, exist_ok=True)

        # Standard icon
        icon = render_memento_logo(icon_sz, is_foreground_only=False, is_round=False)
        icon.save(os.path.join(folder, 'ic_launcher.png'), 'PNG')

        # Round icon
        round_icon = render_memento_logo(icon_sz, is_foreground_only=False, is_round=True)
        round_icon.save(os.path.join(folder, 'ic_launcher_round.png'), 'PNG')

        # Foreground adaptive icon
        fg_icon = render_memento_logo(fg_sz, is_foreground_only=True)
        fg_icon.save(os.path.join(folder, 'ic_launcher_foreground.png'), 'PNG')
        print(f'Generated icons for mipmap-{dens}')

    # Splash screens
    splash_targets = [
        ('drawable', 480, 320),
        ('drawable-land-mdpi', 480, 320),
        ('drawable-land-hdpi', 800, 480),
        ('drawable-land-xhdpi', 1280, 720),
        ('drawable-land-xxhdpi', 1600, 960),
        ('drawable-land-xxxhdpi', 1920, 1280),
        ('drawable-port-mdpi', 320, 480),
        ('drawable-port-hdpi', 480, 800),
        ('drawable-port-xhdpi', 720, 1280),
        ('drawable-port-xxhdpi', 960, 1600),
        ('drawable-port-xxxhdpi', 1280, 1920),
    ]

    for folder_name, w, h in splash_targets:
        folder = os.path.join(res_dir, folder_name)
        os.makedirs(folder, exist_ok=True)
        splash = render_splash(w, h)
        splash.save(os.path.join(folder, 'splash.png'), 'PNG')
        print(f'Generated splash for {folder_name} ({w}x{h})')

    print("All assets generated successfully!")

if __name__ == '__main__':
    main()
