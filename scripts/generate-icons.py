"""
Icon generator for Lens Tools (Sharingan Eye Edition).
Generates SVG and crisp PNG icons in 16x16, 32x32, 48x48, and 128x128 sizes.
Features the authentic 3-Tomoe Sharingan from Naruto.
"""
import math
from PIL import Image, ImageDraw

def render_sharingan(size):
    # 4x supersampling for crisp edges and perfect antialiasing
    scale = 4
    canvas_size = size * scale
    cx, cy = canvas_size / 2, canvas_size / 2
    r_iris = canvas_size * 0.46
    
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Outer dark edge / limbus
    draw.ellipse(
        [cx - r_iris, cy - r_iris, cx + r_iris, cy + r_iris],
        fill=(220, 20, 25, 255),
        outline=(12, 12, 12, 255),
        width=max(2, int(canvas_size * 0.04))
    )
    
    # Thin connecting tomoe orbit ring
    r_ring = canvas_size * 0.27
    draw.ellipse(
        [cx - r_ring, cy - r_ring, cx + r_ring, cy + r_ring],
        outline=(15, 15, 15, 235),
        width=max(1, int(canvas_size * 0.018))
    )
    
    # Central pupil
    r_pupil = canvas_size * 0.095
    draw.ellipse(
        [cx - r_pupil, cy - r_pupil, cx + r_pupil, cy + r_pupil],
        fill=(10, 10, 10, 255)
    )
    
    # 3 Tomoe placed symmetrically at 120-degree intervals (-90 deg [top], 30 deg, 150 deg)
    r_head = canvas_size * 0.052
    for angle_deg in [-90, 30, 150]:
        # Head circle
        rad = math.radians(angle_deg)
        tx = cx + r_ring * math.cos(rad)
        ty = cy + r_ring * math.sin(rad)
        draw.ellipse([tx - r_head, ty - r_head, tx + r_head, ty + r_head], fill=(10, 10, 10, 255))
        
        # Tail curving counter-clockwise along the orbit ring
        tail_poly = []
        steps = 40
        arc_span = 48.0 # degrees
        for i in range(steps + 1):
            t = i / float(steps)
            curr_deg = angle_deg - t * arc_span
            curr_rad = math.radians(curr_deg)
            w = r_head * (1.0 - t)**1.2
            rx = cx + (r_ring + w) * math.cos(curr_rad)
            ry = cy + (r_ring + w) * math.sin(curr_rad)
            tail_poly.append((rx, ry))
            
        for i in range(steps, -1, -1):
            t = i / float(steps)
            curr_deg = angle_deg - t * arc_span
            curr_rad = math.radians(curr_deg)
            w = -r_head * 0.75 * (1.0 - t)**1.2
            rx = cx + (r_ring + w) * math.cos(curr_rad)
            ry = cy + (r_ring + w) * math.sin(curr_rad)
            tail_poly.append((rx, ry))
            
        draw.polygon(tail_poly, fill=(10, 10, 10, 255))
        
    return img.resize((size, size), Image.Resampling.LANCZOS)

def generate_svg():
    # Generate SVG path for a single Tomoe
    R = 27.0
    r_head = 5.2
    arc_deg = 48.0
    
    pts_outer = []
    pts_inner = []
    steps = 16
    for i in range(steps + 1):
        t = i / float(steps)
        deg = -90.0 - t * arc_deg
        rad = math.radians(deg)
        w_out = r_head * (1.0 - t)**1.2
        w_in = -r_head * 0.75 * (1.0 - t)**1.2
        pts_outer.append((round((R + w_out) * math.cos(rad), 2), round((R + w_out) * math.sin(rad), 2)))
        pts_inner.append((round((R + w_in) * math.cos(rad), 2), round((R + w_in) * math.sin(rad), 2)))
        
    pts_inner.reverse()
    all_pts = pts_outer + pts_inner
    path_d = 'M ' + ' L '.join([f'{x},{y}' for x, y in all_pts]) + ' Z'

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <!-- Sharingan Eye (Naruto 3-Tomoe) -->
  <defs>
    <!-- Single Tomoe Definition -->
    <g id="sharingan-tomoe">
      <!-- Tomoe Head -->
      <circle cx="0" cy="-27" r="5.2" fill="#0D0D0D"/>
      <!-- Curved Tail -->
      <path d="{path_d}" fill="#0D0D0D"/>
    </g>
  </defs>

  <!-- Outer Iris (Crimson Red) with Dark Edge -->
  <circle cx="50" cy="50" r="46" fill="#DC1419" stroke="#0D0D0D" stroke-width="4"/>

  <!-- Inner Orbit Ring -->
  <circle cx="50" cy="50" r="27" fill="none" stroke="#0D0D0D" stroke-width="2" opacity="0.9"/>

  <!-- Center Pupil -->
  <circle cx="50" cy="50" r="9.5" fill="#0D0D0D"/>

  <!-- Three Tomoes at 0°, 120°, 240° -->
  <g transform="translate(50, 50)">
    <use href="#sharingan-tomoe" />
    <use href="#sharingan-tomoe" transform="rotate(120)" />
    <use href="#sharingan-tomoe" transform="rotate(240)" />
  </g>
</svg>"""
    return svg

def main():
    sizes = [16, 32, 48, 128]
    for s in sizes:
        img = render_sharingan(s)
        out_path = f"/home/divyanshu/Rough/Project/icons/icon{s}.png"
        img.save(out_path)
        print(f"Generated {out_path} ({s}x{s})")

    svg_content = generate_svg()
    svg_path = "/home/divyanshu/Rough/Project/icons/icon.svg"
    with open(svg_path, "w") as f:
        f.write(svg_content)
    print(f"Generated {svg_path}")

if __name__ == "__main__":
    main()
