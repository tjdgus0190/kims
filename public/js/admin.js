/* 관리자 화면 보조 스크립트 */
(function () {
  'use strict';

  /* 삭제 등 확인이 필요한 폼 */
  document.querySelectorAll('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.confirm(form.getAttribute('data-confirm'))) e.preventDefault();
    });
  });

  var form = document.querySelector('[data-product-form]');
  if (!form) return;

  /* 기존 이미지 순서 변경 / 삭제 */
  var box = form.querySelector('[data-images]');
  box.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var fig = btn.closest('[data-existing]');
    if (btn.hasAttribute('data-img-remove')) fig.remove();
    if (btn.hasAttribute('data-img-left') && fig.previousElementSibling) box.insertBefore(fig, fig.previousElementSibling);
    if (btn.hasAttribute('data-img-right')) {
      var next = fig.nextElementSibling;
      if (next && next.hasAttribute('data-existing')) box.insertBefore(next, fig);
    }
  });

  /* 새 사진: 미리보기 + 업로드 전 자동 최적화(최대 1600px, WebP) */
  var input = form.querySelector('[data-file-input]');
  var previews = form.querySelector('[data-new-previews]');
  var submit = form.querySelector('[data-submit]');
  var MAX = 1600;

  function optimize(file) {
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !window.createImageBitmap) return resolve(file);
      createImageBitmap(file).then(function (bmp) {
        var scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
        if (scale === 1 && file.size < 900 * 1024) return resolve(file);
        var c = document.createElement('canvas');
        c.width = Math.round(bmp.width * scale);
        c.height = Math.round(bmp.height * scale);
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        c.toBlob(function (blob) {
          if (!blob || blob.size >= file.size) return resolve(file);
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' }));
        }, 'image/webp', 0.86);
      }).catch(function () { resolve(file); });
    });
  }

  input.addEventListener('change', function () {
    var files = Array.prototype.slice.call(input.files);
    if (!files.length) return;
    submit.disabled = true;
    submit.textContent = '사진 최적화 중…';
    Promise.all(files.map(optimize)).then(function (out) {
      try {
        var dt = new DataTransfer();
        out.forEach(function (f) { dt.items.add(f); });
        input.files = dt.files;
      } catch (e) { /* 구형 브라우저: 원본 그대로 업로드 */ }
      previews.innerHTML = '';
      out.forEach(function (f) {
        var fig = document.createElement('figure');
        fig.className = 'a-img a-img--pending';
        var img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        fig.appendChild(img);
        previews.appendChild(fig);
      });
      submit.disabled = false;
      submit.textContent = '저장하기';
    });
  });

  form.addEventListener('submit', function () {
    submit.disabled = true;
    submit.textContent = '저장 중…';
  });
})();
