"use client";

import { motion } from "framer-motion";
import { Github, Linkedin, Mail, ExternalLink, ChevronDown, Trophy, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import Link from "next/link";
import Background from "./components/Background";
import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  const lenis = useLenis();
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Carousel State
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const experiences = [
    {
      role: "Full Stack Developer",
      company: "TrailMail (AI EdTech Startup)",
      period: "Dec 2024 - Present",
      desc: "Architected and designed the entire tech stack, integrating NextJS, FastAPI, and Supabase for an AI EdTech web application, improving speed by 25%. Led a team of 8 developers, conducting weekly SCRUM meetings to manage project sprints and ensure timely delivery. Drove user acquisition to 1000+ active users by developing intuitive UI/UX features.",
      skills: ["Next.js", "FastAPI", "Supabase", "Team Leadership", "Scrum"]
    },
    {
      role: "Software Development Intern",
      company: "Industry Platform",
      period: "Mar 2024 - Jan 2025",
      desc: "Developed a scalable registration site from scratch using Flask and Firebase, integrated with email services and CRM. Automated CRM report scheduling using cron jobs. Created custom Google Sheets features with Apps Script and built an AI-powered business card extractor.",
      skills: ["Flask", "Firebase", "Google Apps Script", "CRM Automation"]
    },
    {
      role: "Freelance Programmer",
      company: "Self-Employed",
      period: "May 2022 - Present",
      desc: "Provided freelance programming services, delivering responsive web solutions tailored to diverse client needs. Managed 24/7 hosting for client websites, ensuring continuous availability and optimal performance.",
      skills: ["Web Development", "Hosting", "Client Management"]
    }
  ];

  const originalProjects = [
    {
        title: "HackoMania",
        category: "Hackathon",
        desc: "Awarded Special Mention for developing a web extension and application that dynamically injects event maps into subreddits. Integrated GitHub authentication and chat for collaborative features.",
        tags: ["Web Extension", "Next.js", "Hackathon"],
        link: "https://github.com/jovantan88", 
        code: "https://github.com/jovantan88",
        gradient: "from-pink-500/20 to-rose-900/20"
    },
    {
        title: "Kaggle Competitions",
        category: "Machine Learning",
        desc: "Participated in multiple Kaggle machine learning competitions, securing 3 third-place and 2 fourth-place finishes. Applied advanced machine learning techniques to solve complex data challenges.",
        tags: ["Machine Learning", "Data Science", "Competition"],
        link: "https://www.kaggle.com/",
        code: "https://github.com/jovantan88",
        gradient: "from-cyan-500/20 to-blue-900/20"
    },
    {
        title: "Solid Pods Hackathon",
        category: "Hackathon",
        desc: "Secured 2nd Place in the Solid Pods Hackathon, exploring innovative decentralized data solutions. Demonstrated strong problem-solving skills and adaptability in a competitive development environment.",
        tags: ["Decentralized Web", "Hackathon", "Solid Pods"],
        link: "https://github.com/jovantan88",
        code: "https://github.com/jovantan88",
        gradient: "from-yellow-500/20 to-orange-900/20"
    },
    {
        title: "AI CTF",
        category: "Cybersecurity / AI",
        desc: "Achieved 5th Place in the GovTech AI Capture The Flag competition, showcasing advanced AI and problem-solving abilities in a security context.",
        tags: ["AI", "Cybersecurity", "CTF"],
        link: "https://github.com/jovantan88",
        code: "https://github.com/jovantan88",
        gradient: "from-red-500/20 to-red-900/20"
    },
    {
        title: "Vegetable Prediction",
        category: "Deep Learning",
        desc: "Developed a full-stack vegetable prediction website, achieving 99.4% accuracy by training a custom Convolutional Neural Network on a dataset of 15 vegetables.",
        tags: ["Deep Learning", "CNN", "Full Stack"],
        link: "https://veggie-128d.onrender.com/",
        code: "https://gitlab.com/kyourandesu1/vegetable-prediction",
        gradient: "from-green-500/20 to-emerald-900/20"
    },
    {
        title: "Car Price Prediction",
        category: "Machine Learning",
        desc: "A website to allow users to predict the price of a car based on its features.",
        tags: ["Machine Learning", "Full Stack"],
        link: "https://devops-ca1-jovan-tan.onrender.com/",
        code: "https://gitlab.com/devops-ml-jovan/car-price-prediction",
        gradient: "from-blue-500/20 to-indigo-900/20"
    },
    {
        title: "Disability Website",
        category: "Web Development",
        desc: "A very in depth website to gain awareness about learning disabilities and how to help them.",
        tags: ["Web Development"],
        link: "https://jovantan88.github.io/learning-disability-website/",
        code: "https://github.com/jovantan88/learning-disability-website",
        gradient: "from-purple-500/20 to-pink-900/20"
    },
    {
        title: "GAN Project",
        category: "Deep Learning",
        desc: "A project to generate images using different GANs based on CIFAR10 dataset.",
        tags: ["Deep Learning", "GAN"],
        code: "https://github.com/jovantan88/Deep-Learning-School",
        gradient: "from-orange-500/20 to-red-900/20"
    },
    {
        title: "Gymnasium RL",
        category: "Reinforcement Learning",
        desc: "Going through as many gymnasium environments as possible to learn about RL.",
        tags: ["Reinforcement Learning"],
        code: "https://github.com/jovantan88",
        gradient: "from-cyan-500/20 to-blue-900/20"
    },
    {
        title: "RL Networks",
        category: "Reinforcement Learning",
        desc: "Using many different networks to solve the Pendulum environment.",
        tags: ["Reinforcement Learning"],
        code: "https://github.com/jovantan88",
        gradient: "from-yellow-500/20 to-orange-900/20"
    }
  ];

  const projects = [...originalProjects, ...originalProjects, ...originalProjects];
  const [currentIndex, setCurrentIndex] = useState(originalProjects.length);

  const scrollToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const cards = container.querySelectorAll('.project-card');
    if (cards[index]) {
        const card = cards[index] as HTMLElement;
        const scrollLeft = card.offsetLeft - container.offsetLeft - (container.clientWidth - card.clientWidth) / 2;
        
        container.scrollTo({
            left: scrollLeft,
            behavior: behavior
        });
    }
  };

  const nextSlide = () => {
    scrollToIndex(currentIndex + 1);
  };

  const prevSlide = () => {
    scrollToIndex(currentIndex - 1);
  };

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    
    const totalScrollWidth = container.scrollWidth;
    const singleSetWidth = totalScrollWidth / 3;
    
    // Teleport Logic
    if (container.scrollLeft >= singleSetWidth * 2) {
        container.scrollLeft -= singleSetWidth;
    } else if (container.scrollLeft <= singleSetWidth * 0.5) {
        container.scrollLeft += singleSetWidth;
    }

    const center = container.scrollLeft + container.clientWidth / 2;
    const cards = container.querySelectorAll('.project-card');
    let closestIndex = 0;
    let minDistance = Infinity;

    cards.forEach((card, index) => {
        const cardCenter = (card as HTMLElement).offsetLeft + (card as HTMLElement).clientWidth / 2;
        const distance = Math.abs(center - cardCenter);
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
        }
    });
    
    if (closestIndex !== currentIndex) {
        setCurrentIndex(closestIndex);
    }
  };

  // Initial Scroll Position
  useEffect(() => {
      const timer = setTimeout(() => {
          scrollToIndex(originalProjects.length, 'instant');
      }, 100);
      return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isHovering) return;
    const interval = setInterval(() => {
        nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [currentIndex, isHovering]);

  useEffect(() => {
    if (!lenis || !contentRef.current) return;

    let isSnapping = false;
    let accumulatedUpScroll = 0;

    const onScroll = ({ scroll, direction }: { scroll: number; direction: number }) => {
      if (isSnapping || !contentRef.current) return;

      const contentTop = contentRef.current.offsetTop;
      const downThreshold = 30;

      // Scrolling Down from Top towards Content
      if (direction === 1 && scroll < contentTop && scroll > downThreshold) {
        isSnapping = true;
        lenis.scrollTo(contentRef.current, {
          lock: true,
          duration: 1.5,
          onComplete: () => {
            isSnapping = false;
          },
        });
      }
    };

    // @ts-ignore
    const originalVirtualScroll = lenis.options.virtualScroll;

    // @ts-ignore
    lenis.options.virtualScroll = (e: any) => {
      if (!contentRef.current || isSnapping) return false;

      const contentTop = contentRef.current.offsetTop;
      const atContentTop = Math.abs(lenis.scroll - contentTop) < 10;

      // If we are at content top AND scrolling up
      if (atContentTop && e.deltaY < 0) {
        accumulatedUpScroll += Math.abs(e.deltaY);

        // If threshold reached, snap to top
        if (accumulatedUpScroll > 150) {
          isSnapping = true;
          lenis.scrollTo(0, {
            lock: true,
            duration: 1.5,
            onComplete: () => {
              isSnapping = false;
              accumulatedUpScroll = 0;
            },
          });
        }

        // Prevent actual scroll (swallow event) so we don't see the gap
        return false;
      }

      // Reset accumulator if we scroll down or are not at content top
      if (e.deltaY > 0 || !atContentTop) {
        accumulatedUpScroll = 0;
      }

      return true;
    };

    lenis.on("scroll", onScroll);

    return () => {
      lenis.off("scroll", onScroll);
      // @ts-ignore
      lenis.options.virtualScroll = originalVirtualScroll;
    };
  }, [lenis]);

  return (
    <div className="relative min-h-screen font-sans text-white selection:bg-purple-500/30">
      <Background />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl font-bold tracking-tighter font-heading z-50 relative"
        >
          jovan.work
        </motion.div>
        
        {/* Desktop Nav */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden md:flex gap-6 text-sm font-medium text-zinc-400"
        >
          <Link href="#about" className="hover:text-white transition-colors">About</Link>
          <Link href="#skills" className="hover:text-white transition-colors">Skills</Link>
          <Link href="#experience" className="hover:text-white transition-colors">Experience</Link>
          <Link href="#projects" className="hover:text-white transition-colors">Projects</Link>
          <Link href="#contact" className="hover:text-white transition-colors">Contact</Link>
        </motion.div>

        {/* Mobile Nav Toggle */}
        <div className="md:hidden z-50 relative">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
                {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
        </div>

        {/* Mobile Nav Overlay */}
        {isMobileMenuOpen && (
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed inset-0 bg-black/95 backdrop-blur-xl z-40 flex flex-col items-center justify-center gap-8 text-2xl font-medium text-zinc-400"
            >
                <Link href="#about" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition-colors">About</Link>
                <Link href="#skills" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition-colors">Skills</Link>
                <Link href="#experience" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition-colors">Experience</Link>
                <Link href="#projects" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition-colors">Projects</Link>
                <Link href="#contact" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition-colors">Contact</Link>
            </motion.div>
        )}
      </nav>

      <main className="w-full">
        
        {/* Hero Section */}
        <div className="flex flex-col items-center w-full px-6 pt-32 pb-20 md:px-12">
          <motion.section 
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex flex-col items-center justify-center min-h-[80vh] text-center max-w-4xl mx-auto"
          >
            <motion.div variants={fadeInUp} className="mb-6 relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur opacity-75 animate-pulse"></div>
              <div className="relative px-4 py-1 bg-black rounded-full border border-white/10 text-xs font-medium text-zinc-300 font-mono">
                Available for work
              </div>
            </motion.div>
            
            <motion.h1 
              variants={fadeInUp}
              className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50 font-heading"
            >
              Data | AI | <br /> Full Stack
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 leading-relaxed"
            >
              Building digital experiences with a focus on Machine Learning, Data Analytics, and Web Development.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="flex gap-4">
              <Link 
                href="#projects"
                className="px-8 py-3 rounded-full bg-white text-black font-medium hover:bg-zinc-200 transition-colors"
              >
                View Work
              </Link>
              <Link 
                href="#contact"
                className="px-8 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-md"
              >
                Contact Me
              </Link>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="absolute bottom-10 animate-bounce"
            >
              <ChevronDown className="w-6 h-6 text-zinc-500" />
            </motion.div>
          </motion.section>
        </div>

        {/* Content Wrapper with Translucent Background */}
        <div ref={contentRef} className="w-full bg-black/40 backdrop-blur-2xl border-t border-white/10">
          <div className="flex flex-col items-center w-full px-6 py-20 md:px-12">
            
            {/* About Section */}
            <section id="about" className="w-full max-w-5xl py-20 md:py-32">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold font-heading">About Me</h2>
                  <p className="text-zinc-400 leading-relaxed">
                    Hi, I'm Jovan. I'm 19 this year and currently pursuing a diploma in Applied AI and Analytics. 
                    Coding is my passion and I have an interest in web development and reinforcement learning.
                  </p>
                </div>
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative p-8 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-xl">
                    <h3 className="text-xl font-semibold mb-4">Achievements</h3>
                    <ul className="space-y-4">
                        <li className="flex gap-3 items-start">
                            <Trophy className="w-5 h-5 text-yellow-500 shrink-0 mt-1" />
                            <div>
                                <p className="font-medium text-zinc-200">2nd Place - IMDA Solid Pod Hackathon</p>
                                <p className="text-sm text-zinc-500">2024</p>
                            </div>
                        </li>
                        <li className="flex gap-3 items-start">
                            <Trophy className="w-5 h-5 text-zinc-400 shrink-0 mt-1" />
                            <div>
                                <p className="font-medium text-zinc-200">5th Place - Singapore AI CTF by Govtech</p>
                                <p className="text-sm text-zinc-500">2024</p>
                            </div>
                        </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Skills Section */}
            <section id="skills" className="w-full max-w-6xl py-20 md:py-32">
                <h2 className="text-3xl font-bold mb-12 text-center font-heading">Technical Skills</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Web Development */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-blue-400 font-heading">Web Development</h3>
                        <div className="space-y-2">
                            <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider font-mono">Frameworks</p>
                            <div className="flex flex-wrap gap-2">
                                {["React", "Flask", "Next.js", "Tailwind CSS", "Bootstrap"].map(s => (
                                    <span key={s} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-300 font-mono">{s}</span>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider font-mono">Database</p>
                            <div className="flex flex-wrap gap-2">
                                {["Firebase", "Supabase", "MySQL", "PostgreSQL"].map(s => (
                                    <span key={s} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-300 font-mono">{s}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Data Analytics */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-purple-400 font-heading">Data Analytics</h3>
                        <div className="space-y-2">
                            <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider font-mono">Applications</p>
                            <div className="flex flex-wrap gap-2">
                                {["Tableau", "Power BI"].map(s => (
                                    <span key={s} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-300 font-mono">{s}</span>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider font-mono">Visualisation</p>
                            <div className="flex flex-wrap gap-2">
                                {["Plotly", "Seaborn", "Matplotlib"].map(s => (
                                    <span key={s} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-300 font-mono">{s}</span>
                                ))}
                            </div>
                        </div>
                         <div className="space-y-2">
                            <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider font-mono">Data Manipulation</p>
                            <div className="flex flex-wrap gap-2">
                                {["Pandas", "Numpy"].map(s => (
                                    <span key={s} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-300 font-mono">{s}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Machine Learning */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-green-400 font-heading">Machine & Deep Learning</h3>
                        <div className="space-y-2">
                            <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider font-mono">Libraries</p>
                            <div className="flex flex-wrap gap-2">
                                {["Scikit-learn", "Keras", "AutoML", "TensorFlow", "PyTorch", "OpenAI Gym"].map(s => (
                                    <span key={s} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-300 font-mono">{s}</span>
                                ))}
                            </div>
                        </div>
                         <div className="space-y-2">
                            <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider font-mono">Networks</p>
                            <div className="flex flex-wrap gap-2">
                                {["CNN", "RNN", "GAN", "DQN", "RAG"].map(s => (
                                    <span key={s} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-300 font-mono">{s}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Experience Section */}
            <section id="experience" className="w-full max-w-4xl py-20 md:py-32">
                <h2 className="text-3xl font-bold mb-12 text-center font-heading">Work Experience</h2>
                <div className="space-y-8">
                    {experiences.map((exp, index) => (
                        <div key={index} className="group relative p-8 rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                                <div>
                                    <h3 className="text-xl font-bold text-white font-heading">{exp.role}</h3>
                                    <p className="text-zinc-400 font-mono text-sm">{exp.company}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-400 whitespace-nowrap font-mono">
                                    {exp.period}
                                </span>
                            </div>
                            <p className="text-zinc-300 leading-relaxed mb-6">
                                {exp.desc}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {exp.skills.map(skill => (
                                    <span key={skill} className="px-3 py-1 rounded-full text-xs font-medium bg-black/20 border border-white/5 text-zinc-500 group-hover:text-zinc-400 transition-colors font-mono">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Projects Section */}
            <section id="projects" className="w-full py-20 md:py-32 overflow-hidden">
              <div className="max-w-6xl mx-auto px-6 md:px-12 mb-12 flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-4 font-heading">Selected Works</h2>
                  <p className="text-zinc-400 max-w-md">
                    A collection of projects that I've worked on, ranging from web development to machine learning.
                  </p>
                </div>
                
                {/* Carousel Controls */}
                <div className="flex gap-4">
                    <button 
                        onClick={prevSlide}
                        className="p-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-white"
                        aria-label="Previous project"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={nextSlide}
                        className="p-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-white"
                        aria-label="Next project"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
              </div>

              <motion.div 
                ref={carouselRef}
                onScroll={handleScroll}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className="flex gap-6 px-6 md:px-12 overflow-x-auto pb-12 snap-x snap-mandatory scrollbar-hide"
                drag="x"
                dragConstraints={{ right: 0, left: -10000 }}
              >
                {projects.map((item, index) => (
                  <motion.div 
                    key={index}
                    className={`project-card min-w-[85vw] md:min-w-[600px] snap-center group relative flex flex-col justify-between p-8 rounded-3xl border bg-white/5 transition-all duration-500 overflow-hidden ${
                        index === currentIndex 
                        ? "border-white/20 bg-white/10 scale-100 opacity-100" 
                        : "border-white/5 opacity-50 scale-95"
                    }`}
                  >
                    {/* Hover Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                            <span className="text-xs font-medium tracking-wider text-zinc-500 uppercase block font-mono">{item.category}</span>
                            <div className="flex gap-2">
                                {item.code && (
                                    <a href={item.code} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/5 hover:bg-white/20 transition-colors text-zinc-400 hover:text-white">
                                        <Github className="w-5 h-5" />
                                    </a>
                                )}
                                {item.link && (
                                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/5 hover:bg-white/20 transition-colors text-zinc-400 hover:text-white">
                                        <ExternalLink className="w-5 h-5" />
                                    </a>
                                )}
                            </div>
                        </div>
                        
                        <h3 className="text-3xl md:text-4xl font-bold mb-4 group-hover:text-white transition-colors font-heading">{item.title}</h3>
                        <p className="text-zinc-400 text-lg leading-relaxed mb-8 group-hover:text-zinc-300 transition-colors max-w-md">
                            {item.desc}
                        </p>
                    </div>

                    <div className="relative z-10 flex flex-wrap gap-2 mt-auto">
                        {item.tags.map(tag => (
                            <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium bg-black/20 border border-white/5 text-zinc-400 font-mono">
                                {tag}
                            </span>
                        ))}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="w-full max-w-2xl py-20 md:py-32 text-center">
              <h2 className="text-3xl font-bold mb-6 font-heading">Get In Touch</h2>
              <p className="text-zinc-400 mb-8">
                I'm currently looking for new opportunities, my inbox is always open. 
                Whether you have a question or just want to say hi, I'll try my best to get back to you!
              </p>
              <a 
                href="mailto:jovantanwork@gmail.com"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-medium hover:bg-zinc-200 transition-colors font-heading"
              >
                <Mail className="w-5 h-5" />
                Say Hello
              </a>
              
              <div className="mt-16 flex justify-center gap-6">
                <a href="https://github.com/jovantan88" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors">
                  <Github className="w-6 h-6" />
                </a>
                <a href="https://www.linkedin.com/in/jovan-tan-a01143248/" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors">
                  <Linkedin className="w-6 h-6" />
                </a>
              </div>
            </section>

            <footer className="w-full py-8 text-center text-zinc-600 text-sm">
              <p>© {new Date().getFullYear()} Jovan Tan. All rights reserved.</p>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
