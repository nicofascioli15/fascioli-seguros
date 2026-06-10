#!/bin/bash
set -e
echo 'Actualizando logo y favicon...'

cat > public/logo-fascioli.svg << 'FILEEOF'
<?xml version="1.0" encoding="UTF-8"?>
<svg id="Capa_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 198.43 113.39">
  <!-- Generator: Adobe Illustrator 30.4.0, SVG Export Plug-In . SVG Version: 2.1.4 Build 226)  -->
  <defs>
    <style>
      .st0 {
        fill: #fff;
      }
    </style>
  </defs>
  <g>
    <path class="st0" d="M23.06,85.73h.75v1.52c-.42.47-1.03.69-1.81.69-.66,0-1.22-.22-1.66-.65s-.66-.98-.66-1.65.22-1.22.68-1.66,1-.66,1.65-.66,1.18.19,1.61.57l-.4.58c-.18-.15-.35-.25-.53-.3s-.39-.08-.62-.08c-.46,0-.83.15-1.14.44s-.46.68-.46,1.15.15.86.44,1.15c.3.29.66.43,1.08.43s.78-.1,1.07-.28v-1.23h.01Z"/>
    <path class="st0" d="M25.75,86.89l-.44,1.01h-.8l1.97-4.47h.8l1.97,4.47h-.8l-.44-1.01h-2.24ZM27.69,86.2l-.82-1.84-.82,1.84h1.63Z"/>
    <path class="st0" d="M31.54,84.02c-.22,0-.4.04-.54.14-.14.08-.21.22-.21.4s.07.32.21.42c.14.1.44.19.9.3s.8.26,1.04.47.35.5.35.89-.15.71-.44.96-.68.36-1.16.36c-.69,0-1.32-.24-1.86-.72l.47-.57c.46.39.91.58,1.41.58.25,0,.43-.06.58-.15.14-.11.21-.25.21-.42s-.07-.3-.21-.4c-.14-.1-.36-.18-.69-.26-.33-.08-.58-.15-.75-.22-.17-.07-.32-.15-.46-.26-.26-.19-.4-.51-.4-.91s.15-.73.46-.96.68-.33,1.12-.33c.29,0,.57.04.84.14s.53.22.73.4l-.4.57c-.14-.12-.3-.22-.54-.29s-.44-.11-.66-.11h0Z"/>
    <path class="st0" d="M36.22,84.14v3.78h-.75v-3.78h-1.36v-.69h3.46v.69h-1.36Z"/>
    <path class="st0" d="M42.44,87.29c-.46.44-1.01.66-1.68.66s-1.22-.22-1.68-.66c-.46-.44-.68-1-.68-1.65s.22-1.21.68-1.65,1.01-.66,1.68-.66,1.22.22,1.68.66.68,1,.68,1.65-.22,1.21-.68,1.65ZM41.9,84.5c-.3-.32-.68-.47-1.12-.47s-.82.15-1.12.47-.46.69-.46,1.15.15.83.46,1.15.68.47,1.12.47.82-.15,1.12-.47c.3-.32.46-.69.46-1.15s-.15-.83-.46-1.15Z"/>
    <path class="st0" d="M45.75,84.02c-.22,0-.4.04-.54.14-.14.08-.21.22-.21.4s.07.32.21.42c.14.1.44.19.9.3s.8.26,1.04.47.35.5.35.89-.15.71-.44.96-.68.36-1.16.36c-.69,0-1.32-.24-1.86-.72l.47-.57c.46.39.91.58,1.41.58.25,0,.43-.06.58-.15.14-.11.21-.25.21-.42s-.07-.3-.21-.4c-.14-.1-.36-.18-.69-.26-.33-.08-.58-.15-.75-.22-.17-.07-.32-.15-.46-.26-.26-.19-.4-.51-.4-.91s.15-.73.46-.96.68-.33,1.12-.33c.29,0,.57.04.84.14s.53.22.73.4l-.4.57c-.14-.12-.3-.22-.54-.29s-.44-.11-.66-.11h0Z"/>
    <path class="st0" d="M52.86,87.22c.26,0,.48-.04.66-.12s.39-.22.58-.42l.48.5c-.47.53-1.05.79-1.72.79s-1.23-.22-1.68-.65-.66-.98-.66-1.65.22-1.22.68-1.66,1.03-.66,1.72-.66,1.27.25,1.73.76l-.48.53c-.21-.21-.42-.35-.61-.43s-.42-.12-.66-.12c-.46,0-.83.15-1.14.44s-.46.66-.46,1.12.15.83.46,1.14.66.46,1.08.46h.01Z"/>
    <path class="st0" d="M59.58,87.29c-.46.44-1.01.66-1.68.66s-1.22-.22-1.68-.66-.68-1-.68-1.65.22-1.21.68-1.65,1.01-.66,1.68-.66,1.22.22,1.68.66.68,1,.68,1.65-.22,1.21-.68,1.65ZM59.02,84.5c-.3-.32-.68-.47-1.12-.47s-.82.15-1.12.47-.46.69-.46,1.15.15.83.46,1.15.68.47,1.12.47.82-.15,1.12-.47c.3-.32.46-.69.46-1.15s-.15-.83-.46-1.15Z"/>
    <path class="st0" d="M62.28,87.9h-.75v-4.47h1.18l1.34,2.81,1.34-2.81h1.16v4.47h-.75v-3.49l-1.57,3.1h-.42l-1.55-3.1s0,3.49,0,3.49Z"/>
    <path class="st0" d="M69.13,86.89c.21.24.48.36.83.36s.62-.12.83-.36c.21-.24.3-.57.3-.97v-2.48h.75v2.51c0,.64-.18,1.14-.53,1.48-.36.35-.8.53-1.36.53s-1.01-.18-1.36-.53c-.36-.35-.53-.84-.53-1.48v-2.51h.75v2.48c0,.42.1.73.3.97Z"/>
    <path class="st0" d="M76.71,83.44h.75v4.47h-.82l-2.53-3.26v3.26h-.75v-4.47h.75l2.59,3.34v-3.34h.01Z"/>
    <path class="st0" d="M82.16,83.44v.71h-2.38v1.18h2.15v.66h-2.15v1.19h2.47v.71h-3.21v-4.47h3.14v.03Z"/>
    <path class="st0" d="M84.87,84.02c-.22,0-.4.04-.54.14s-.21.22-.21.4.07.32.21.42.44.19.9.3.8.26,1.04.47c.24.19.35.5.35.89s-.15.71-.44.96-.68.36-1.16.36c-.69,0-1.32-.24-1.86-.72l.47-.57c.46.39.91.58,1.41.58.25,0,.43-.06.58-.15.14-.11.21-.25.21-.42s-.07-.3-.21-.4-.36-.18-.69-.26c-.33-.08-.58-.15-.75-.22s-.32-.15-.46-.26c-.26-.19-.4-.51-.4-.91s.15-.73.46-.96.68-.33,1.12-.33c.29,0,.57.04.84.14s.53.22.73.4l-.4.57c-.14-.12-.3-.22-.54-.29s-.44-.11-.66-.11h0Z"/>
    <path class="st0" d="M89.87,88.89v-5.97h.53v5.97h-.53Z"/>
    <path class="st0" d="M96.01,87.9h-.84l-1.8-4.47h.84l1.37,3.34,1.37-3.34h.84l-1.8,4.47h.01Z"/>
    <path class="st0" d="M101.91,83.44v.71h-2.38v1.18h2.15v.66h-2.15v1.19h2.47v.71h-3.21v-4.47h3.14v.03Z"/>
    <path class="st0" d="M106.62,83.44h.75v4.47h-.82l-2.53-3.26v3.26h-.75v-4.47h.75l2.59,3.34v-3.34h.01Z"/>
    <path class="st0" d="M110.62,84.14v3.78h-.75v-3.78h-1.36v-.69h3.46v.69s-1.36,0-1.36,0Z"/>
    <path class="st0" d="M113.74,86.89l-.44,1.01h-.8l1.97-4.47h.8l1.97,4.47h-.8l-.44-1.01s-2.24,0-2.24,0ZM115.66,86.2l-.82-1.84-.82,1.84h1.63Z"/>
    <path class="st0" d="M119.53,84.02c-.22,0-.4.04-.54.14s-.21.22-.21.4.07.32.21.42.44.19.9.3.8.26,1.04.47c.24.19.35.5.35.89s-.15.71-.44.96-.68.36-1.16.36c-.69,0-1.32-.24-1.86-.72l.47-.57c.46.39.91.58,1.41.58.25,0,.43-.06.58-.15.14-.11.21-.25.21-.42s-.07-.3-.21-.4-.36-.18-.69-.26c-.33-.08-.58-.15-.75-.22s-.32-.15-.46-.26c-.26-.19-.4-.51-.4-.91s.15-.73.46-.96.68-.33,1.12-.33c.29,0,.57.04.84.14s.53.22.73.4l-.4.57c-.14-.12-.3-.22-.54-.29s-.44-.11-.66-.11h0Z"/>
    <path class="st0" d="M124.53,88.89v-5.97h.53v5.97h-.53Z"/>
    <path class="st0" d="M129.25,86.89l-.44,1.01h-.8l1.97-4.47h.8l1.97,4.47h-.8l-.44-1.01s-2.24,0-2.24,0ZM131.18,86.2l-.82-1.84-.82,1.84h1.63Z"/>
    <path class="st0" d="M133.68,87.9v-4.47h.75v3.75h2.04v.72h-2.8.01Z"/>
    <path class="st0" d="M139.78,87.95h-.1c-.66,0-1.22-.21-1.68-.65s-.68-1-.68-1.65.22-1.21.68-1.65,1.01-.66,1.68-.66,1.22.22,1.68.66.68.98.68,1.65c0,.5-.14.94-.4,1.33-.26.39-.62.66-1.08.83.14.19.33.29.55.29.17,0,.32-.04.47-.12s.28-.19.36-.33l.43.6c-.37.39-.79.58-1.27.58-.28,0-.54-.08-.79-.24s-.43-.36-.53-.64ZM140.8,84.5c-.3-.32-.68-.47-1.12-.47s-.82.15-1.12.47-.46.69-.46,1.15.15.83.46,1.15.68.47,1.12.47.82-.15,1.12-.47c.3-.32.46-.69.46-1.15s-.15-.83-.46-1.15Z"/>
    <path class="st0" d="M144.31,86.89c.21.24.48.36.83.36s.62-.12.83-.36c.21-.24.3-.57.3-.97v-2.48h.75v2.51c0,.64-.18,1.14-.53,1.48-.36.35-.8.53-1.36.53s-1.01-.18-1.36-.53c-.36-.35-.53-.84-.53-1.48v-2.51h.75v2.48c0,.42.1.73.3.97Z"/>
    <path class="st0" d="M148.53,83.44h.75v4.47h-.75v-4.47Z"/>
    <path class="st0" d="M150.85,87.9v-4.47h.75v3.75h2.04v.72h-2.8.01Z"/>
    <path class="st0" d="M157.93,83.44v.71h-2.38v1.18h2.15v.66h-2.15v1.19h2.47v.71h-3.21v-4.47h3.14v.03Z"/>
    <path class="st0" d="M162.86,84.9c0,.73-.32,1.21-.97,1.4l1.16,1.62h-.96l-1.07-1.5h-1v1.5h-.75v-4.47h1.66c.68,0,1.16.11,1.47.35s.44.6.44,1.11ZM161.85,85.52c.15-.14.24-.35.24-.64s-.08-.5-.24-.6c-.15-.11-.44-.17-.84-.17h-.96v1.59h.94c.43,0,.72-.07.87-.19h-.01Z"/>
    <path class="st0" d="M167.4,83.44v.71h-2.38v1.18h2.15v.66h-2.15v1.19h2.47v.71h-3.21v-4.47h3.14v.03Z"/>
    <path class="st0" d="M170.12,84.02c-.22,0-.4.04-.54.14s-.21.22-.21.4.07.32.21.42c.14.1.44.19.9.3s.8.26,1.04.47c.24.19.35.5.35.89s-.15.71-.44.96-.68.36-1.16.36c-.69,0-1.32-.24-1.86-.72l.47-.57c.46.39.91.58,1.41.58.25,0,.43-.06.58-.15.14-.11.21-.25.21-.42s-.07-.3-.21-.4c-.14-.1-.36-.18-.69-.26-.33-.08-.58-.15-.75-.22s-.32-.15-.46-.26c-.26-.19-.4-.51-.4-.91s.15-.73.46-.96.68-.33,1.12-.33c.29,0,.57.04.84.14s.53.22.73.4l-.4.57c-.14-.12-.3-.22-.54-.29s-.44-.11-.66-.11h0Z"/>
  </g>
  <path class="st0" d="M100.15,76.6h-13.94l6.97-4.21,6.97,4.21Z"/>
  <g>
    <polyline class="st0" points="101.38 71.64 101.38 56.89 96.42 56.89 96.42 68.62"/>
    <g>
      <path class="st0" d="M166.76,76.6V23.96h5.08v52.64h-5.08Z"/>
      <path class="st0" d="M24.7,34.1h0v-5.19h8.21v-4.95h-9.53c-2.04,0-3.7,1.27-3.7,3.62v49.01h5.01v-26.28h8.2v-4.95h-8.2v-11.28h0Z"/>
      <path class="st0" d="M54.91,76.6h-4.96v-26.28h-6.51v26.28h-4.95V28.91c0-3.3,1.58-4.95,4.72-4.95h6.95c3.14,0,4.72,1.65,4.72,4.95v47.69h.01ZM49.96,28.92h-6.51v16.46h6.51v-16.46Z"/>
      <path class="st0" d="M66.97,71.64h6.51v-21.32h-6.51c-3.3,0-4.95-1.65-4.95-4.95v-16.46c0-3.3,1.58-4.95,4.72-4.95h6.95c3.14,0,4.72,1.65,4.72,4.95v8.21h-4.95v-8.21h-6.51v16.46h6.51c3.3,0,4.95,1.65,4.95,4.95v21.32c0,3.31-1.65,4.96-4.95,4.96h-6.51c-3.3,0-4.95-1.65-4.95-4.96v-14.77h4.95s0,14.77,0,14.77Z"/>
      <path class="st0" d="M110.95,76.6V23.96h5.25v52.64h-5.25Z"/>
      <path class="st0" d="M123.53,28.92c0-3.3,1.58-4.95,4.72-4.95h6.95c3.14,0,4.72,1.65,4.72,4.95v42.73c0,3.31-1.65,4.96-4.96,4.96h-6.51c-3.3,0-4.95-1.65-4.95-4.96V28.92h.01ZM128.48,71.64h6.51V28.91h-6.51v42.73Z"/>
      <path class="st0" d="M147.23,74.15c0,1.57,1.62,2.45,2.9,2.45h11.33v-4.97h-9.06V23.96h-5.15v50.17h-.01Z"/>
      <path class="st0" d="M102.49,28.92c0-3.3-1.58-4.95-4.72-4.95h-6.95c-3.16,0-4.72,1.65-4.72,4.95v16.46h0v26.25l4.95-3.02V28.91h6.51v8.2h4.95v-8.21.03Z"/>
    </g>
  </g>
</svg>
FILEEOF
echo '✅ public/logo-fascioli.svg'

cat > public/favicon.svg << 'FILEEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="10" fill="rgb(27,67,95)"/>
  <svg x="4" y="14" width="56" height="32" viewBox="0 0 198.43 113.39">

  <!-- Generator: Adobe Illustrator 30.4.0, SVG Export Plug-In . SVG Version: 2.1.4 Build 226)  -->
  <defs>
    <style>
      .st0 {
        fill: #fff;
      }
    </style>
  </defs>
  <g>
    <path class="st0" d="M23.06,85.73h.75v1.52c-.42.47-1.03.69-1.81.69-.66,0-1.22-.22-1.66-.65s-.66-.98-.66-1.65.22-1.22.68-1.66,1-.66,1.65-.66,1.18.19,1.61.57l-.4.58c-.18-.15-.35-.25-.53-.3s-.39-.08-.62-.08c-.46,0-.83.15-1.14.44s-.46.68-.46,1.15.15.86.44,1.15c.3.29.66.43,1.08.43s.78-.1,1.07-.28v-1.23h.01Z"/>
    <path class="st0" d="M25.75,86.89l-.44,1.01h-.8l1.97-4.47h.8l1.97,4.47h-.8l-.44-1.01h-2.24ZM27.69,86.2l-.82-1.84-.82,1.84h1.63Z"/>
    <path class="st0" d="M31.54,84.02c-.22,0-.4.04-.54.14-.14.08-.21.22-.21.4s.07.32.21.42c.14.1.44.19.9.3s.8.26,1.04.47.35.5.35.89-.15.71-.44.96-.68.36-1.16.36c-.69,0-1.32-.24-1.86-.72l.47-.57c.46.39.91.58,1.41.58.25,0,.43-.06.58-.15.14-.11.21-.25.21-.42s-.07-.3-.21-.4c-.14-.1-.36-.18-.69-.26-.33-.08-.58-.15-.75-.22-.17-.07-.32-.15-.46-.26-.26-.19-.4-.51-.4-.91s.15-.73.46-.96.68-.33,1.12-.33c.29,0,.57.04.84.14s.53.22.73.4l-.4.57c-.14-.12-.3-.22-.54-.29s-.44-.11-.66-.11h0Z"/>
    <path class="st0" d="M36.22,84.14v3.78h-.75v-3.78h-1.36v-.69h3.46v.69h-1.36Z"/>
    <path class="st0" d="M42.44,87.29c-.46.44-1.01.66-1.68.66s-1.22-.22-1.68-.66c-.46-.44-.68-1-.68-1.65s.22-1.21.68-1.65,1.01-.66,1.68-.66,1.22.22,1.68.66.68,1,.68,1.65-.22,1.21-.68,1.65ZM41.9,84.5c-.3-.32-.68-.47-1.12-.47s-.82.15-1.12.47-.46.69-.46,1.15.15.83.46,1.15.68.47,1.12.47.82-.15,1.12-.47c.3-.32.46-.69.46-1.15s-.15-.83-.46-1.15Z"/>
    <path class="st0" d="M45.75,84.02c-.22,0-.4.04-.54.14-.14.08-.21.22-.21.4s.07.32.21.42c.14.1.44.19.9.3s.8.26,1.04.47.35.5.35.89-.15.71-.44.96-.68.36-1.16.36c-.69,0-1.32-.24-1.86-.72l.47-.57c.46.39.91.58,1.41.58.25,0,.43-.06.58-.15.14-.11.21-.25.21-.42s-.07-.3-.21-.4c-.14-.1-.36-.18-.69-.26-.33-.08-.58-.15-.75-.22-.17-.07-.32-.15-.46-.26-.26-.19-.4-.51-.4-.91s.15-.73.46-.96.68-.33,1.12-.33c.29,0,.57.04.84.14s.53.22.73.4l-.4.57c-.14-.12-.3-.22-.54-.29s-.44-.11-.66-.11h0Z"/>
    <path class="st0" d="M52.86,87.22c.26,0,.48-.04.66-.12s.39-.22.58-.42l.48.5c-.47.53-1.05.79-1.72.79s-1.23-.22-1.68-.65-.66-.98-.66-1.65.22-1.22.68-1.66,1.03-.66,1.72-.66,1.27.25,1.73.76l-.48.53c-.21-.21-.42-.35-.61-.43s-.42-.12-.66-.12c-.46,0-.83.15-1.14.44s-.46.66-.46,1.12.15.83.46,1.14.66.46,1.08.46h.01Z"/>
    <path class="st0" d="M59.58,87.29c-.46.44-1.01.66-1.68.66s-1.22-.22-1.68-.66-.68-1-.68-1.65.22-1.21.68-1.65,1.01-.66,1.68-.66,1.22.22,1.68.66.68,1,.68,1.65-.22,1.21-.68,1.65ZM59.02,84.5c-.3-.32-.68-.47-1.12-.47s-.82.15-1.12.47-.46.69-.46,1.15.15.83.46,1.15.68.47,1.12.47.82-.15,1.12-.47c.3-.32.46-.69.46-1.15s-.15-.83-.46-1.15Z"/>
    <path class="st0" d="M62.28,87.9h-.75v-4.47h1.18l1.34,2.81,1.34-2.81h1.16v4.47h-.75v-3.49l-1.57,3.1h-.42l-1.55-3.1s0,3.49,0,3.49Z"/>
    <path class="st0" d="M69.13,86.89c.21.24.48.36.83.36s.62-.12.83-.36c.21-.24.3-.57.3-.97v-2.48h.75v2.51c0,.64-.18,1.14-.53,1.48-.36.35-.8.53-1.36.53s-1.01-.18-1.36-.53c-.36-.35-.53-.84-.53-1.48v-2.51h.75v2.48c0,.42.1.73.3.97Z"/>
    <path class="st0" d="M76.71,83.44h.75v4.47h-.82l-2.53-3.26v3.26h-.75v-4.47h.75l2.59,3.34v-3.34h.01Z"/>
    <path class="st0" d="M82.16,83.44v.71h-2.38v1.18h2.15v.66h-2.15v1.19h2.47v.71h-3.21v-4.47h3.14v.03Z"/>
    <path class="st0" d="M84.87,84.02c-.22,0-.4.04-.54.14s-.21.22-.21.4.07.32.21.42.44.19.9.3.8.26,1.04.47c.24.19.35.5.35.89s-.15.71-.44.96-.68.36-1.16.36c-.69,0-1.32-.24-1.86-.72l.47-.57c.46.39.91.58,1.41.58.25,0,.43-.06.58-.15.14-.11.21-.25.21-.42s-.07-.3-.21-.4-.36-.18-.69-.26c-.33-.08-.58-.15-.75-.22s-.32-.15-.46-.26c-.26-.19-.4-.51-.4-.91s.15-.73.46-.96.68-.33,1.12-.33c.29,0,.57.04.84.14s.53.22.73.4l-.4.57c-.14-.12-.3-.22-.54-.29s-.44-.11-.66-.11h0Z"/>
    <path class="st0" d="M89.87,88.89v-5.97h.53v5.97h-.53Z"/>
    <path class="st0" d="M96.01,87.9h-.84l-1.8-4.47h.84l1.37,3.34,1.37-3.34h.84l-1.8,4.47h.01Z"/>
    <path class="st0" d="M101.91,83.44v.71h-2.38v1.18h2.15v.66h-2.15v1.19h2.47v.71h-3.21v-4.47h3.14v.03Z"/>
    <path class="st0" d="M106.62,83.44h.75v4.47h-.82l-2.53-3.26v3.26h-.75v-4.47h.75l2.59,3.34v-3.34h.01Z"/>
    <path class="st0" d="M110.62,84.14v3.78h-.75v-3.78h-1.36v-.69h3.46v.69s-1.36,0-1.36,0Z"/>
    <path class="st0" d="M113.74,86.89l-.44,1.01h-.8l1.97-4.47h.8l1.97,4.47h-.8l-.44-1.01s-2.24,0-2.24,0ZM115.66,86.2l-.82-1.84-.82,1.84h1.63Z"/>
    <path class="st0" d="M119.53,84.02c-.22,0-.4.04-.54.14s-.21.22-.21.4.07.32.21.42.44.19.9.3.8.26,1.04.47c.24.19.35.5.35.89s-.15.71-.44.96-.68.36-1.16.36c-.69,0-1.32-.24-1.86-.72l.47-.57c.46.39.91.58,1.41.58.25,0,.43-.06.58-.15.14-.11.21-.25.21-.42s-.07-.3-.21-.4-.36-.18-.69-.26c-.33-.08-.58-.15-.75-.22s-.32-.15-.46-.26c-.26-.19-.4-.51-.4-.91s.15-.73.46-.96.68-.33,1.12-.33c.29,0,.57.04.84.14s.53.22.73.4l-.4.57c-.14-.12-.3-.22-.54-.29s-.44-.11-.66-.11h0Z"/>
    <path class="st0" d="M124.53,88.89v-5.97h.53v5.97h-.53Z"/>
    <path class="st0" d="M129.25,86.89l-.44,1.01h-.8l1.97-4.47h.8l1.97,4.47h-.8l-.44-1.01s-2.24,0-2.24,0ZM131.18,86.2l-.82-1.84-.82,1.84h1.63Z"/>
    <path class="st0" d="M133.68,87.9v-4.47h.75v3.75h2.04v.72h-2.8.01Z"/>
    <path class="st0" d="M139.78,87.95h-.1c-.66,0-1.22-.21-1.68-.65s-.68-1-.68-1.65.22-1.21.68-1.65,1.01-.66,1.68-.66,1.22.22,1.68.66.68.98.68,1.65c0,.5-.14.94-.4,1.33-.26.39-.62.66-1.08.83.14.19.33.29.55.29.17,0,.32-.04.47-.12s.28-.19.36-.33l.43.6c-.37.39-.79.58-1.27.58-.28,0-.54-.08-.79-.24s-.43-.36-.53-.64ZM140.8,84.5c-.3-.32-.68-.47-1.12-.47s-.82.15-1.12.47-.46.69-.46,1.15.15.83.46,1.15.68.47,1.12.47.82-.15,1.12-.47c.3-.32.46-.69.46-1.15s-.15-.83-.46-1.15Z"/>
    <path class="st0" d="M144.31,86.89c.21.24.48.36.83.36s.62-.12.83-.36c.21-.24.3-.57.3-.97v-2.48h.75v2.51c0,.64-.18,1.14-.53,1.48-.36.35-.8.53-1.36.53s-1.01-.18-1.36-.53c-.36-.35-.53-.84-.53-1.48v-2.51h.75v2.48c0,.42.1.73.3.97Z"/>
    <path class="st0" d="M148.53,83.44h.75v4.47h-.75v-4.47Z"/>
    <path class="st0" d="M150.85,87.9v-4.47h.75v3.75h2.04v.72h-2.8.01Z"/>
    <path class="st0" d="M157.93,83.44v.71h-2.38v1.18h2.15v.66h-2.15v1.19h2.47v.71h-3.21v-4.47h3.14v.03Z"/>
    <path class="st0" d="M162.86,84.9c0,.73-.32,1.21-.97,1.4l1.16,1.62h-.96l-1.07-1.5h-1v1.5h-.75v-4.47h1.66c.68,0,1.16.11,1.47.35s.44.6.44,1.11ZM161.85,85.52c.15-.14.24-.35.24-.64s-.08-.5-.24-.6c-.15-.11-.44-.17-.84-.17h-.96v1.59h.94c.43,0,.72-.07.87-.19h-.01Z"/>
    <path class="st0" d="M167.4,83.44v.71h-2.38v1.18h2.15v.66h-2.15v1.19h2.47v.71h-3.21v-4.47h3.14v.03Z"/>
    <path class="st0" d="M170.12,84.02c-.22,0-.4.04-.54.14s-.21.22-.21.4.07.32.21.42c.14.1.44.19.9.3s.8.26,1.04.47c.24.19.35.5.35.89s-.15.71-.44.96-.68.36-1.16.36c-.69,0-1.32-.24-1.86-.72l.47-.57c.46.39.91.58,1.41.58.25,0,.43-.06.58-.15.14-.11.21-.25.21-.42s-.07-.3-.21-.4c-.14-.1-.36-.18-.69-.26-.33-.08-.58-.15-.75-.22s-.32-.15-.46-.26c-.26-.19-.4-.51-.4-.91s.15-.73.46-.96.68-.33,1.12-.33c.29,0,.57.04.84.14s.53.22.73.4l-.4.57c-.14-.12-.3-.22-.54-.29s-.44-.11-.66-.11h0Z"/>
  </g>
  <path class="st0" d="M100.15,76.6h-13.94l6.97-4.21,6.97,4.21Z"/>
  <g>
    <polyline class="st0" points="101.38 71.64 101.38 56.89 96.42 56.89 96.42 68.62"/>
    <g>
      <path class="st0" d="M166.76,76.6V23.96h5.08v52.64h-5.08Z"/>
      <path class="st0" d="M24.7,34.1h0v-5.19h8.21v-4.95h-9.53c-2.04,0-3.7,1.27-3.7,3.62v49.01h5.01v-26.28h8.2v-4.95h-8.2v-11.28h0Z"/>
      <path class="st0" d="M54.91,76.6h-4.96v-26.28h-6.51v26.28h-4.95V28.91c0-3.3,1.58-4.95,4.72-4.95h6.95c3.14,0,4.72,1.65,4.72,4.95v47.69h.01ZM49.96,28.92h-6.51v16.46h6.51v-16.46Z"/>
      <path class="st0" d="M66.97,71.64h6.51v-21.32h-6.51c-3.3,0-4.95-1.65-4.95-4.95v-16.46c0-3.3,1.58-4.95,4.72-4.95h6.95c3.14,0,4.72,1.65,4.72,4.95v8.21h-4.95v-8.21h-6.51v16.46h6.51c3.3,0,4.95,1.65,4.95,4.95v21.32c0,3.31-1.65,4.96-4.95,4.96h-6.51c-3.3,0-4.95-1.65-4.95-4.96v-14.77h4.95s0,14.77,0,14.77Z"/>
      <path class="st0" d="M110.95,76.6V23.96h5.25v52.64h-5.25Z"/>
      <path class="st0" d="M123.53,28.92c0-3.3,1.58-4.95,4.72-4.95h6.95c3.14,0,4.72,1.65,4.72,4.95v42.73c0,3.31-1.65,4.96-4.96,4.96h-6.51c-3.3,0-4.95-1.65-4.95-4.96V28.92h.01ZM128.48,71.64h6.51V28.91h-6.51v42.73Z"/>
      <path class="st0" d="M147.23,74.15c0,1.57,1.62,2.45,2.9,2.45h11.33v-4.97h-9.06V23.96h-5.15v50.17h-.01Z"/>
      <path class="st0" d="M102.49,28.92c0-3.3-1.58-4.95-4.72-4.95h-6.95c-3.16,0-4.72,1.65-4.72,4.95v16.46h0v26.25l4.95-3.02V28.91h6.51v8.2h4.95v-8.21.03Z"/>
    </g>
  </g>

  </svg>
</svg>
FILEEOF
echo '✅ public/favicon.svg'

cat > app/layout.tsx << 'FILEEOF'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fascioli Seguros — Intranet',
  description: 'Sistema interno de gestión de seguros',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}

FILEEOF
echo '✅ app/layout.tsx'

cat > app/login/page.tsx << 'FILEEOF'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', padding: '48px 40px',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.3)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            background: 'rgb(27,67,95)', borderRadius: 14,
            padding: '16px 24px', display: 'inline-block', marginBottom: 16
          }}>
            <img src="/logo-fascioli.svg" alt="Fascioli Seguros" style={{ height: 48, display: 'block' }} />
          </div>
          <div style={{ fontSize: '13px', color: 'var(--slate)' }}>
            Acceso al sistema interno
          </div>
        </div>

        {/* Form */}
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="usuario@fascioli.com.uy"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <div className="form-group">
          <label>Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ paddingRight: '40px' }}
            />
            <button
              onClick={() => setShowPass(!showPass)}
              style={{
                position: 'absolute', right: '12px', top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer', color: 'var(--slate)', padding: '4px'
              }}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#FDEAEA', color: '#B03030', padding: '10px 14px',
            borderRadius: '8px', fontSize: '13px', marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <button
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </div>
    </div>
  )
}

FILEEOF
echo '✅ app/login/page.tsx'

cat > components/Sidebar.tsx << 'FILEEOF'
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Users, FileText, CreditCard,
  Bell, AlertTriangle, FolderOpen, Settings, LogOut
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/clientes',     icon: Users,           label: 'Clientes' },
  { href: '/polizas',      icon: FileText,        label: 'Pólizas' },
  { href: '/pagos',        icon: CreditCard,      label: 'Pagos' },
  { href: '/vencimientos', icon: Bell,            label: 'Vencimientos' },
  { href: '/siniestros',   icon: AlertTriangle,   label: 'Siniestros' },
  { href: '/documentos',   icon: FolderOpen,      label: 'Documentos' },
]

const LIMIT_GB = 1
const LIMIT_BYTES = LIMIT_GB * 1024 * 1024 * 1024

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [usedBytes, setUsedBytes] = useState<number | null>(null)

  useEffect(() => {
    fetchStorageUsage()
  }, [])

  async function fetchStorageUsage() {
    try {
      const { data } = await supabase
        .from('documentos')
        .select('tamanio_bytes')
      if (data) {
        const total = data.reduce((sum, d) => sum + (d.tamanio_bytes || 0), 0)
        setUsedBytes(total)
      }
    } catch {}
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const pct     = usedBytes !== null ? Math.min((usedBytes / LIMIT_BYTES) * 100, 100) : 0
  const barColor = pct > 80 ? '#D94F4F' : pct > 50 ? '#D97706' : '#2E9668'

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ justifyContent: 'center', padding: '20px 16px' }}>
        <img src="/logo-fascioli.svg" alt="Fascioli Seguros" style={{ width: '100%', maxWidth: 160, height: 'auto', display: 'block' }} />
      </div>

      <nav style={{ flex: 1, padding: '10px 0' }}>
        <div className="nav-section">Menú</div>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            <item.icon size={17} />
            {item.label}
          </Link>
        ))}
        <div className="nav-section" style={{ marginTop: '10px' }}>Sistema</div>
        <Link href="/configuracion" className={`nav-item ${pathname.startsWith('/configuracion') ? 'active' : ''}`}>
          <Settings size={17} />
          Configuración
        </Link>
      </nav>

      <div style={{ padding: '12px 16px 0', borderTop: '1px solid rgba(255,255,255,.07)' }}>
        {/* Storage indicator */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Almacenamiento
            </span>
            <span style={{ fontSize: 11, color: 'var(--slate-light)' }}>
              {usedBytes !== null ? `${formatBytes(usedBytes)} / ${LIMIT_GB} GB` : '...'}
            </span>
          </div>
          <div style={{ background: 'rgba(255,255,255,.1)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${pct}%`,
              background: barColor,
              transition: 'width .6s ease'
            }} />
          </div>
          {pct > 80 && (
            <div style={{ fontSize: 10, color: '#D94F4F', marginTop: 4, fontWeight: 600 }}>
              ⚠️ Espacio casi lleno
            </div>
          )}
        </div>

        {/* Logout */}
        <div style={{ paddingBottom: 16 }}>
          <button
            onClick={handleLogout}
            className="nav-item"
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--slate-light)', width: '100%' }}
          >
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  )
}

FILEEOF
echo '✅ components/Sidebar.tsx'

echo ''
echo '🎉 Listo:'
echo '   git add .'
echo '   git commit -m "feat: logo oficial Fascioli en sidebar, login y favicon"'
echo '   git push'
