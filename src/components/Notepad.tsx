const RESUME_TEXT = `=========================================
         SERGEI PARFENOV
             Resume
=========================================

Contact Information:
--------------------
  LinkedIn:  linkedin.com/in/sergey-p-721b25171/
  GitHub:    github.com/P0rt
  Email:     sergey.paarfenov@gmail.com
  Facebook:  facebook.com/Duckambition

=========================================
         WORK EXPERIENCE
=========================================

--- TripleTen (tripleten.com) -----------
Technical Product Manager
Jul 2023 - Present

As the technical leader for the student
learning experience, my primary focus is on
optimizing educational outcomes using
cutting-edge methodologies and technologies.
I've implemented LLM, introduced ML-based
features, and launched features for automated
code verification and training hints. These
innovations have boosted CR, Revenue, and
significantly enhanced student satisfaction.

--- Practicum USA (practicum.com) -------
Product Manager
Dec 2020 - Jul 2023

I successfully launched the QA-Engineering
faculty in the USA, boasting a 70% product
activation rate. Hundreds of students have
been trained under this initiative. Our
platform offers cutting-edge content with
predictable releases of both educational
material and features.

--- Yandex Praktikum --------------------
Tech Product Manager // Technical Writer
Mar 2018 - Dec 2020

I was a part of the team that launched the
Web Developer faculty and created courses:
regular expressions, webpack, git, and bash.
I also created a test architecture for the
platform (sandbox).

--- Thingyfy (thingyfy.com) -------------
Full Stack Developer
Oct 2019 - Dec 2021

I created projects for a Canadian startup
using the following technologies: React,
TypeScript, Node, Python, and GitLab.

--- European Gymnasium (eurogym.ru) -----
Teacher
Dec 2018 - May 2019

I instructed preliminary class students in
computer science, emphasizing web
development.

--- Sravni (sravni.ru) ------------------
Software Engineer
Nov 2017 - Oct 2018

I joined the product team right away to
revamp the "OSAGO" product. Over the course
of a year, our team rewrote three products
(electronic OSAGO purchase, CASCO, and
Travel) using ReactJS.

--- Spaces -------------------------------
Software Engineer
Mar 2017 - Nov 2017

We built a commercial real estate startup.
Together with the back-end developer, we
created a project from scratch with 20
screens and a search filter. The database
was unique and the project wasn't an
aggregator of other listings. Back-end:
Django. Front-end: ReactJS, Redux.

--- Moscow Coding School (moscoding.ru) --
Teaching Assistant
Oct 2016 - Aug 2017

At this school, I supported children in their
technological learning, including the use of
the Arduino IDE, Swift, and Minecraft Python
IDE. During evenings, I facilitated workshops
with adults, covering frontend and backend
development and VR mapping.

=========================================
              EOF
=========================================`

export function Notepad() {
  return (
    <>
      <div className="notepad-menubar">
        <span className="notepad-menu">File</span>
        <span className="notepad-menu">Edit</span>
        <span className="notepad-menu">Format</span>
        <span className="notepad-menu">View</span>
        <span className="notepad-menu">Help</span>
      </div>
      <div className="window-body" style={{ padding: 0, flex: 1, display: 'flex' }}>
        <textarea
          className="notepad-content"
          defaultValue={RESUME_TEXT}
          spellCheck={false}
        />
      </div>
      <div className="status-bar">
        <p className="status-bar-field">Ln 1, Col 1</p>
      </div>
    </>
  )
}
