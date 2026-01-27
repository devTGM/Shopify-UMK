if(!customElements.get('hero-slider')){class HeroSlider extends HTMLElement{constructor(){super();if(Shopify.designMode){window.addEventListener("shopify:section:load",e=>{this.mountSlider()})}
this.mountSlider();window.addEventListener("shopify:block:select",e=>{const selectedSlideIndex=+e.target.dataset.index;this.slider.slideTo(selectedSlideIndex,600)});this.lastActiveIndex=null;this.addKeyboardNavigation()}
mountSlider(){const autoplayOptions={delay:this.dataset.autoplayInterval};this.slider=new Swiper(this,{rewind:!0,slidesPerView:1,speed:600,followFinger:!1,navigation:{nextEl:".swiper-button--next",prevEl:".swiper-button--prev"},pagination:{el:".swiper-pagination",clickable:!0,renderBullet:function(i,className){return `
            <button class="${className}">
              <span>0${i + 1}</span>
              <svg class="square-progress" width="26" height="26">
                <rect class="square-origin" width="26" height="26" rx="5" ry="5" />
              </svg>
              <svg class="progress" width="18" height="18" style="inset-inline-start: ${
                0 - (i * 2.4 + 3.4)
              }rem">
                <circle class="circle-origin" r="8" cx="9.5" cy="9.5"></circle>
              </svg>
            </button>
            `}},autoplay:this.dataset.autoplay==="true"?autoplayOptions:!1,on:{init:this.handleSlideChange.bind(this),slideChange:this.handleSlideChange.bind(this)}})}
handleSlideChange(swiper){this.handleSlideChangeAnimations(swiper);let headerInner=document.querySelector(".header__inner");let heroInners=document.querySelectorAll(".hero__inner");if(!headerInner||!heroInners){return}
document.documentElement.style.setProperty("--transparent-header-menu-text-color",heroInners[swiper.activeIndex].dataset.headerMenuTextColor)}
handleSlideChangeAnimations(swiper){let delay=300;const queryElement=`[data-index="${swiper.activeIndex}"]`;const queryArray=[...swiper.wrapperEl.querySelector(queryElement).querySelectorAll('.hero__animation')||[]];if(!queryArray.length){return}
const isMobile=window.innerWidth<750;const allowMobileAnimation=swiper.wrapperEl.closest(".hero__content")?.dataset.animationMobile==="true";if(!allowMobileAnimation&&isMobile){queryArray.forEach((element)=>{element.classList.remove('in-delay')});return}
queryArray.forEach((element)=>{element.classList.add('in-delay')});if(this.lastActiveIndex>swiper.activeIndex){delay=650+delay;swiper.wrapperEl.style.transitionDuration='1000ms';swiper.wrapperEl.style.transitionTimingFunction='cubic-bezier(0.45, 0.00, 0.15, 0.95)'}else if(this.lastActiveIndex<swiper.activeIndex){delay=1000+delay;swiper.wrapperEl.style.transitionDuration='1000ms';swiper.wrapperEl.style.transitionTimingFunction='cubic-bezier(0.45, 0.00, 0.15, 0.95)'}
setTimeout(()=>{if(this.lastActiveIndex>swiper.activeIndex){delay=325+delay}else if(this.lastActiveIndex<swiper.activeIndex){delay=500+delay}
queryArray.forEach((element,index)=>{if(index===1){delay=delay+50}else if(index===2){delay=delay+175}else if(index===3){delay=delay+300}
element.classList.remove("in-delay")})},delay);this.lastActiveIndex=swiper.activeIndex}
addKeyboardNavigation(){document.addEventListener("keydown",event=>{if(this.isInViewport()){if(event.key==="ArrowRight"){const nextButton=this.querySelector(".swiper-button--next");if(nextButton){nextButton.click()}}
if(event.key==="ArrowLeft"){const prevButton=this.querySelector(".swiper-button--prev");if(prevButton){prevButton.click()}}}})}
isInViewport(){const rect=this.getBoundingClientRect();return(rect.top<window.innerHeight&&rect.bottom>0&&rect.left<window.innerWidth&&rect.right>0)}}
customElements.define('hero-slider',HeroSlider)}