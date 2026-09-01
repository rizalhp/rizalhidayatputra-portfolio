/* =========================================================
   ASPIK PORTFOLIO
   FINAL SCRIPT
========================================================= */


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

const menuButton =
  document.querySelector(
    ".menu-button"
  );

const nav =
  document.querySelector(
    ".nav"
  );


menuButton?.addEventListener(
  "click",
  () => {

    const isOpen =
      nav.classList.toggle(
        "is-open"
      );


    menuButton.setAttribute(
      "aria-expanded",
      String(isOpen)
    );

  }
);


document
  .querySelectorAll(
    ".nav a"
  )
  .forEach(
    (link) => {

      link.addEventListener(
        "click",
        () => {

          nav.classList.remove(
            "is-open"
          );


          menuButton?.setAttribute(
            "aria-expanded",
            "false"
          );

        }
      );

    }
  );


/* =========================================================
   PREVENT IMAGE DRAG
========================================================= */

document
  .querySelectorAll(
    "img"
  )
  .forEach(
    (image) => {

      image.setAttribute(
        "draggable",
        "false"
      );

    }
  );


document.addEventListener(
  "dragstart",
  (event) => {

    event.preventDefault();

  }
);


/* =========================================================
   PREVENT TEXT SELECT / COPY
========================================================= */

[
  "selectstart",
  "copy",
  "cut",
  "contextmenu"
]
.forEach(
  (eventName) => {

    document.addEventListener(
      eventName,
      (event) => {

        event.preventDefault();

      }
    );

  }
);


/* =========================================================
   PREVENT COMMON COPY SHORTCUTS
========================================================= */

document.addEventListener(
  "keydown",
  (event) => {

    const key =
      event.key.toLowerCase();


    const modifier =
      event.metaKey ||
      event.ctrlKey;


    if (
      modifier &&
      [
        "a",
        "c",
        "x",
        "s",
        "u",
        "p"
      ].includes(key)
    ) {

      event.preventDefault();

    }

  }
);


/* =========================================================
   LOOPING SCROLL REVEAL
========================================================= */

/*
  IMPORTANT:

  Tidak ada observer.unobserve().

  Artinya:
  - masuk viewport  -> fade in
  - keluar viewport -> fade out
  - masuk lagi      -> fade in lagi
  - looping terus
*/


const revealElements =
  document.querySelectorAll(
    ".reveal"
  );


const revealObserver =
  new IntersectionObserver(

    (entries) => {

      entries.forEach(
        (entry) => {

          if (
            entry.isIntersecting
          ) {

            entry.target
              .classList
              .add(
                "is-visible"
              );

          }

          else {

            entry.target
              .classList
              .remove(
                "is-visible"
              );

          }

        }
      );

    },

    {
      threshold:
        0.12,

      rootMargin:
        "-4% 0px -8% 0px"
    }

  );


revealElements.forEach(
  (element) => {

    revealObserver.observe(
      element
    );

  }
);


/* =========================================================
   PARTICLE BACKGROUND
========================================================= */

const canvas =
  document.querySelector(
    ".particles"
  );


const ctx =
  canvas?.getContext(
    "2d"
  );


let particles = [];

let particleAnimationFrame =
  null;


/* =========================================================
   CREATE PARTICLES
========================================================= */

function createParticles() {

  const particleCount =
    Math.max(

      52,

      Math.min(

        115,

        Math.floor(
          window.innerWidth /
          17
        )

      )

    );


  particles =
    Array.from(

      {
        length:
          particleCount
      },

      () => ({

        x:
          Math.random() *
          window.innerWidth,

        y:
          Math.random() *
          window.innerHeight,

        radius:
          Math.random() *
          1.7 +
          0.3,

        alpha:
          Math.random() *
          0.42 +
          0.12,

        velocityX:
          (
            Math.random() -
            0.5
          ) *
          0.20,

        velocityY:
          -(
            Math.random() *
            0.52 +
            0.12
          ),

        twinkle:
          Math.random() *
          Math.PI *
          2

      })

    );

}


/* =========================================================
   RESIZE CANVAS
========================================================= */

function resizeCanvas() {

  if (
    !canvas ||
    !ctx
  ) {

    return;

  }


  const devicePixelRatio =
    Math.min(

      window.devicePixelRatio ||
      1,

      2

    );


  canvas.width =
    Math.floor(

      window.innerWidth *
      devicePixelRatio

    );


  canvas.height =
    Math.floor(

      window.innerHeight *
      devicePixelRatio

    );


  canvas.style.width =
    `${window.innerWidth}px`;


  canvas.style.height =
    `${window.innerHeight}px`;


  ctx.setTransform(

    devicePixelRatio,

    0,

    0,

    devicePixelRatio,

    0,

    0

  );


  createParticles();

}


/* =========================================================
   DRAW AMBIENT GLOW
========================================================= */

function drawAmbientGlow() {

  const glow =
    ctx.createRadialGradient(

      window.innerWidth *
      0.63,

      window.innerHeight *
      0.13,

      0,

      window.innerWidth *
      0.63,

      window.innerHeight *
      0.13,

      Math.max(

        window.innerWidth,

        window.innerHeight

      ) *
      0.76

    );


  glow.addColorStop(

    0,

    "rgba(185, 144, 79, 0.11)"

  );


  glow.addColorStop(

    0.42,

    "rgba(128, 83, 35, 0.035)"

  );


  glow.addColorStop(

    1,

    "rgba(0, 0, 0, 0)"

  );


  ctx.fillStyle =
    glow;


  ctx.fillRect(

    0,

    0,

    window.innerWidth,

    window.innerHeight

  );

}


/* =========================================================
   DRAW PARTICLES
========================================================= */

function drawParticles() {

  if (
    !canvas ||
    !ctx
  ) {

    return;

  }


  ctx.clearRect(

    0,

    0,

    window.innerWidth,

    window.innerHeight

  );


  drawAmbientGlow();


  particles.forEach(
    (particle) => {


      particle.x +=
        particle.velocityX;


      particle.y +=
        particle.velocityY;


      particle.twinkle +=
        0.035;


      /* reset vertical */

      if (
        particle.y <
        -12
      ) {

        particle.y =
          window.innerHeight +
          12;


        particle.x =
          Math.random() *
          window.innerWidth;

      }


      /* horizontal wrapping */

      if (
        particle.x <
        -20
      ) {

        particle.x =
          window.innerWidth +
          20;

      }


      if (
        particle.x >
        window.innerWidth +
        20
      ) {

        particle.x =
          -20;

      }


      const currentAlpha =
        Math.max(

          0.05,

          particle.alpha +

          Math.sin(
            particle.twinkle
          ) *

          0.10

        );


      ctx.beginPath();


      ctx.fillStyle =
        `rgba(
          220,
          193,
          138,
          ${currentAlpha}
        )`;


      ctx.arc(

        particle.x,

        particle.y,

        particle.radius,

        0,

        Math.PI *
        2

      );


      ctx.fill();

    }
  );


  particleAnimationFrame =
    window.requestAnimationFrame(
      drawParticles
    );

}


/* =========================================================
   INITIALIZE PARTICLES
========================================================= */

if (
  canvas &&
  ctx
) {

  resizeCanvas();


  const reducedMotion =
    window.matchMedia(

      "(prefers-reduced-motion: reduce)"

    );


  if (
    !reducedMotion.matches
  ) {

    drawParticles();

  }


  window.addEventListener(

    "resize",

    resizeCanvas,

    {
      passive:
        true
    }

  );


  document.addEventListener(

    "visibilitychange",

    () => {


      if (
        document.hidden
      ) {

        if (
          particleAnimationFrame
        ) {

          cancelAnimationFrame(
            particleAnimationFrame
          );


          particleAnimationFrame =
            null;

        }

      }


      else {

        if (
          !particleAnimationFrame &&
          !reducedMotion.matches
        ) {

          drawParticles();

        }

      }

    }

  );

}


/* =========================================================
   SMOOTH INTERNAL LINKS
========================================================= */

document
  .querySelectorAll(
    'a[href^="#"]'
  )
  .forEach(
    (anchor) => {

      anchor.addEventListener(
        "click",
        (event) => {

          const href =
            anchor.getAttribute(
              "href"
            );


          if (
            !href ||
            href === "#"
          ) {

            return;

          }


          const target =
            document.querySelector(
              href
            );


          if (
            !target
          ) {

            return;

          }


          event.preventDefault();


          target.scrollIntoView({

            behavior:
              "smooth",

            block:
              "start"

          });

        }
      );

    }
  );