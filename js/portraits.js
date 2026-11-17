/*
 * 数学家画像：全部用代码画的插画（不是照片，只取每个人的大致特征）。
 * MG.portrait(id) 返回 <figure>，带名字和年份；名字文字在 strings.js（m + 名字）。
 * 每一页只要提到数学家，就放上他的画像。
 */
(function (root) {
  'use strict';
  var MG = root.MG;

  /** 金色椭圆画框；uid 让同一页上多个画框的 clipPath 不撞名 */
  function frame(uid, inner) {
    return '<svg viewBox="0 0 200 240" aria-hidden="true">' +
      '<defs><clipPath id="pf-' + uid + '"><ellipse cx="100" cy="120" rx="86" ry="108"/></clipPath></defs>' +
      '<ellipse cx="100" cy="120" rx="94" ry="116" fill="#c99a2e" stroke="#1d2433" stroke-width="3"/>' +
      '<ellipse cx="100" cy="120" rx="86" ry="108" fill="#dfe6ee" stroke="#8a6414" stroke-width="2"/>' +
      '<g clip-path="url(#pf-' + uid + ')">' +
      '<path d="M100 92 C90 70 30 60 26 150 H174 C170 60 110 70 100 92 Z" fill="#cfd8e3" opacity=".6"/>' +
      inner + '</g></svg>';
  }
  /** 西装上身：外套颜色、领带或领结 */
  function suit(coat, lapel, neck) {
    return '<path d="M14 240 Q18 182 62 170 L100 196 L138 170 Q182 182 186 240 Z" fill="' + coat + '" stroke="#1d2433" stroke-width="2.5"/>' +
      '<path d="M62 170 L84 214 L100 196 Z M138 170 L116 214 L100 196 Z" fill="' + lapel + '" stroke="#1d2433" stroke-width="2"/>' +
      '<path d="M86 138 h28 v30 h-28 Z" fill="' + neck + '" stroke="#1d2433" stroke-width="2"/>';
  }
  function eyes(y, iris) {
    return '<ellipse cx="87" cy="' + y + '" rx="4.5" ry="3.4" fill="#fff"/><circle cx="87.5" cy="' + y + '" r="2.4" fill="' + iris + '"/>' +
      '<ellipse cx="113" cy="' + y + '" rx="4.5" ry="3.4" fill="#fff"/><circle cx="112.5" cy="' + y + '" r="2.4" fill="' + iris + '"/>';
  }
  function cheeks() {
    return '<ellipse cx="80" cy="128" rx="6" ry="4" fill="#e9a08c" opacity=".35"/><ellipse cx="120" cy="128" rx="6" ry="4" fill="#e9a08c" opacity=".35"/>';
  }
  function ears(skin) {
    return '<ellipse cx="64" cy="108" rx="6" ry="10" fill="' + skin + '" stroke="#1d2433" stroke-width="2"/>' +
      '<ellipse cx="136" cy="108" rx="6" ry="10" fill="' + skin + '" stroke="#1d2433" stroke-width="2"/>';
  }

  /** 狄利克雷：卷发、鬓角、高领白衬衫配黑领结 */
  function dirichlet(uid) {
    return frame(uid,
      suit('#2b2f3a', '#3b4150', '#f0c9a5') +
      '<path d="M70 162 L88 150 L100 176 L112 150 L130 162 L118 186 L100 178 L82 186 Z" fill="#fff" stroke="#1d2433" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M86 176 L100 182 L114 176 L114 192 L100 186 L86 192 Z" fill="#14161c" stroke="#1d2433" stroke-width="2" stroke-linejoin="round"/>' +
      '<circle cx="100" cy="184" r="4" fill="#14161c"/>' +
      '<path d="M66 96 C64 136 80 156 100 156 C120 156 136 136 134 96 C134 70 66 70 66 96 Z" fill="#f4d0ad" stroke="#1d2433" stroke-width="2.6"/>' +
      ears('#efc39c') +
      '<path d="M66 92 C64 112 68 126 74 134 C74 120 72 106 74 94 Z" fill="#3a2a20"/>' +
      '<path d="M134 92 C136 112 132 126 126 134 C126 120 128 106 126 94 Z" fill="#3a2a20"/>' +
      '<path d="M60 100 C52 70 66 42 96 38 C130 34 150 56 142 100 C139 90 134 84 126 82 C114 92 94 90 80 84 C71 88 64 94 60 100 Z" fill="#3a2a20" stroke="#1d2433" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M70 62 q8 -8 16 0 M92 50 q8 -8 16 0 M114 54 q8 -8 16 0 M82 76 q6 -6 12 0 M118 72 q6 -5 12 2" fill="none" stroke="#5c4433" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M78 98 q9 -6 18 -1 M104 97 q9 -5 18 1" fill="none" stroke="#3a2a20" stroke-width="3" stroke-linecap="round"/>' +
      eyes(108, '#2b3a4a') +
      '<path d="M100 110 C98 120 96 126 100 129 C103 130 106 128 104 126" fill="none" stroke="#b07a55" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M90 140 q10 5 20 0" fill="none" stroke="#9b5a45" stroke-width="2.6" stroke-linecap="round"/>' + cheeks());
  }

  /** 施坦豪斯：年长、头顶光亮、两侧白发、灰色小胡子、灰西装配深色领带 */
  function steinhaus(uid) {
    var skin = '#f1c9a4';
    return frame(uid,
      suit('#5b6170', '#6c7282', skin) +
      '<path d="M78 160 L100 178 L122 160 L114 152 L100 164 L86 152 Z" fill="#fff" stroke="#1d2433" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M95 168 L105 168 L108 196 L100 206 L92 196 Z" fill="#7a1f2b" stroke="#1d2433" stroke-width="2" stroke-linejoin="round"/>' +
      // 圆一点的头，头顶没有头发
      '<path d="M64 100 C62 138 80 158 100 158 C120 158 138 138 136 100 C138 56 62 56 64 100 Z" fill="' + skin + '" stroke="#1d2433" stroke-width="2.6"/>' +
      ears(skin) +
      // 两侧白发
      '<path d="M62 104 C56 90 60 76 70 70 C68 82 70 94 74 104 Z" fill="#e8e8e8" stroke="#1d2433" stroke-width="2"/>' +
      '<path d="M138 104 C144 90 140 76 130 70 C132 82 130 94 126 104 Z" fill="#e8e8e8" stroke="#1d2433" stroke-width="2"/>' +
      // 额头皱纹、头顶反光
      '<path d="M84 80 q16 -5 32 0 M88 87 q12 -4 24 0" fill="none" stroke="#c99a7a" stroke-width="1.8" stroke-linecap="round"/>' +
      '<ellipse cx="88" cy="68" rx="10" ry="5" fill="#fff" opacity=".35"/>' +
      '<path d="M78 99 q9 -4 18 0 M104 99 q9 -4 18 0" fill="none" stroke="#bdbdbd" stroke-width="3.2" stroke-linecap="round"/>' +
      eyes(108, '#4a5a6a') +
      '<path d="M100 110 C98 120 95 127 100 130 C104 131 107 128 105 126" fill="none" stroke="#b07a55" stroke-width="2.2" stroke-linecap="round"/>' +
      // 灰色小胡子
      '<path d="M86 137 C92 131 98 133 100 136 C102 133 108 131 114 137 C108 140 102 139 100 138 C98 139 92 140 86 137 Z" fill="#cfcfcf" stroke="#1d2433" stroke-width="1.6"/>' +
      '<path d="M92 145 q8 3 16 0" fill="none" stroke="#9b5a45" stroke-width="2.4" stroke-linecap="round"/>' + cheeks());
  }

  /** 巴拿赫：深色头发往后梳、额头高、宽脸、深色西装配条纹领带 */
  function banach(uid) {
    var skin = '#f3cfaa';
    return frame(uid,
      suit('#262a33', '#343a46', skin) +
      '<path d="M78 160 L100 178 L122 160 L114 152 L100 164 L86 152 Z" fill="#fff" stroke="#1d2433" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M95 168 L105 168 L109 198 L100 208 L91 198 Z" fill="#2f4a7a" stroke="#1d2433" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M94 176 L106 172 M93 186 L107 181 M92 196 L108 190" stroke="#9fb6e0" stroke-width="2"/>' +
      // 宽一点的脸
      '<path d="M62 96 C60 138 80 158 100 158 C120 158 140 138 138 96 C138 66 62 66 62 96 Z" fill="' + skin + '" stroke="#1d2433" stroke-width="2.6"/>' +
      ears(skin) +
      // 往后梳的头发：发际线高、光滑，几道梳痕
      '<path d="M58 98 C50 62 70 36 100 34 C130 36 150 62 142 98 C140 88 136 80 128 77 C116 74 84 74 72 77 C64 80 60 88 58 98 Z" fill="#2a221d" stroke="#1d2433" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M76 62 C86 48 114 46 126 60 M82 54 C92 44 110 42 120 52" fill="none" stroke="#4a3b31" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M77 98 q10 -6 19 -2 M104 96 q10 -4 19 2" fill="none" stroke="#2a221d" stroke-width="3.4" stroke-linecap="round"/>' +
      eyes(107, '#3b2f28') +
      '<path d="M100 109 C97 120 94 128 100 131 C105 132 108 129 106 127" fill="none" stroke="#b07a55" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M89 141 q11 6 22 0" fill="none" stroke="#9b5a45" stroke-width="2.6" stroke-linecap="round"/>' + cheeks());
  }


  /** 高斯：黑色天鹅绒小圆帽、两侧白发、年长的脸、白色领巾、深色外套配毛领 */
  function gauss(uid) {
    var skin = '#f0c8a2';
    return frame(uid,
      '<path d="M14 240 Q18 180 62 168 L100 194 L138 168 Q182 180 186 240 Z" fill="#2e2a33" stroke="#1d2433" stroke-width="2.5"/>' +
      '<path d="M40 182 Q60 164 84 170 L100 196 L116 170 Q140 164 160 182 Q150 200 130 196 L100 206 L70 196 Q50 200 40 182 Z" fill="#7a5a3c" stroke="#1d2433" stroke-width="2"/>' +
      '<path d="M86 138 h28 v30 h-28 Z" fill="' + skin + '" stroke="#1d2433" stroke-width="2"/>' +
      '<path d="M76 162 Q100 176 124 162 L120 186 Q100 196 80 186 Z" fill="#f7f4ec" stroke="#1d2433" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M90 172 q10 6 20 0 M92 180 q8 5 16 0" fill="none" stroke="#c9c2b0" stroke-width="1.6"/>' +
      '<path d="M64 98 C62 138 80 158 100 158 C120 158 138 138 136 98 C136 64 64 64 64 98 Z" fill="' + skin + '" stroke="#1d2433" stroke-width="2.6"/>' +
      ears(skin) +
      // 两侧白发
      '<path d="M60 108 C52 96 54 80 64 72 C66 86 68 98 74 108 Z" fill="#eeeeee" stroke="#1d2433" stroke-width="2"/>' +
      '<path d="M140 108 C148 96 146 80 136 72 C134 86 132 98 126 108 Z" fill="#eeeeee" stroke="#1d2433" stroke-width="2"/>' +
      // 黑色小圆帽
      '<path d="M60 80 C58 52 80 38 100 38 C120 38 142 52 140 80 C126 70 74 70 60 80 Z" fill="#141218" stroke="#1d2433" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M72 60 C86 50 114 50 128 60" fill="none" stroke="#3a3540" stroke-width="2.2" stroke-linecap="round"/>' +
      // 皱纹、眉、眼、鼻、嘴
      '<path d="M84 86 q16 -4 32 0" fill="none" stroke="#c99a7a" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M78 99 q9 -5 18 -1 M104 98 q9 -4 18 1" fill="none" stroke="#d0d0d0" stroke-width="3.2" stroke-linecap="round"/>' +
      eyes(108, '#5a6f86') +
      '<path d="M80 114 q6 3 12 0 M108 114 q6 3 12 0" fill="none" stroke="#c99a7a" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M100 110 C98 121 95 128 100 131 C104 132 107 129 105 127" fill="none" stroke="#b07a55" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M90 142 q10 4 20 0" fill="none" stroke="#9b5a45" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M78 132 q4 8 10 10 M122 132 q-4 8 -10 10" fill="none" stroke="#d9a888" stroke-width="1.4"/>' + cheeks());
  }




  /** 伯恩赛德：维多利亚时代的英国学者——头顶稀疏、两侧短发、浓密的大胡子、高领白衬衫、深色西装 */
  function burnside(uid) {
    var skin = '#f1caa6';
    return frame(uid,
      suit('#2d3340', '#3c4352', skin) +
      '<path d="M76 160 L100 176 L124 160 L116 150 L100 162 L84 150 Z" fill="#fff" stroke="#1d2433" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M90 170 L100 176 L110 170 L110 182 L100 178 L90 182 Z" fill="#1d2433"/>' +
      '<path d="M64 98 C62 136 80 156 100 156 C120 156 138 136 136 98 C136 60 64 60 64 98 Z" fill="' + skin + '" stroke="#1d2433" stroke-width="2.6"/>' +
      ears(skin) +
      // 两侧短发，头顶稀疏
      '<path d="M63 110 C58 98 60 86 68 82 C72 90 72 100 72 110 Z" fill="#8a7a6a"/>' +
      '<path d="M137 110 C142 98 140 86 132 82 C128 90 128 100 128 110 Z" fill="#8a7a6a"/>' +
      '<path d="M84 68 q16 -6 32 0" fill="none" stroke="#8a7a6a" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="90" cy="72" rx="9" ry="4" fill="#fff" opacity=".3"/>' +
      '<path d="M78 97 q9 -5 18 -1 M104 96 q9 -4 18 1" fill="none" stroke="#6b5b4b" stroke-width="3" stroke-linecap="round"/>' +
      eyes(106, '#3b4a5a') +
      '<path d="M100 108 C98 118 96 124 100 127 C104 128 106 126 104 124" fill="none" stroke="#b07a55" stroke-width="2.2" stroke-linecap="round"/>' +
      // 浓密的大胡子（连着两颊）
      '<path d="M66 112 C64 150 84 178 100 180 C116 178 136 150 134 112 C128 128 118 134 100 134 C82 134 72 128 66 112 Z" fill="#8a7a6a" stroke="#1d2433" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M78 146 q6 6 12 0 q6 6 12 0 q6 6 12 0 q6 6 12 0 M84 162 q6 6 12 0 q6 6 12 0 q6 6 12 0" fill="none" stroke="#6b5b4b" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M84 131 C92 125 108 125 116 131" fill="none" stroke="#6b5b4b" stroke-width="4.5" stroke-linecap="round"/>' +
      '<path d="M94 138 q6 3 12 0" fill="none" stroke="#9b5a45" stroke-width="2.2" stroke-linecap="round"/>');
  }

  var DRAW = { dirichlet: dirichlet, steinhaus: steinhaus, banach: banach, gauss: gauss, burnside: burnside };
  var uid = 0;
  /** 一幅带名字的画像 */
  MG.portrait = function (id) {
    var t = MG.i18n.t;
    return '<figure class="portrait">' + DRAW[id]('p' + (++uid)) +
      '<figcaption><b>' + t('m_' + id) + '</b><span>' + t('millus') + '</span></figcaption></figure>';
  };
})(window);
