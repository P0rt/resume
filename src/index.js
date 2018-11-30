import React from "react";
import styles from './index.css';
import { render } from "react-dom";
import { Rnd } from "react-rnd";
import logo from './img/sd.jpg'

function focusSkills() {
    document.getElementById('resume').style.zIndex = 1;
    document.getElementById('skills').style.zIndex = -1;
}

function focusResume() {
    document.getElementById('resume').style.zIndex = -1;
    document.getElementById('skills').style.zIndex = 1;
}

const App = () => (
    <div>
        <Rnd
            id="skills"
            onClick={focusResume}
            className="kek kek--first"
            default={{
                x: 200,
                y: 40,
                width: '50%',
                height: '50%'
            }}
        >
            <div className="line">
                <div className="line__ring">
                    <a className="line__ring--link" href="">?</a>
                </div>
            </div>
            <div className="header__kek">
                <h3>Technical skills</h3>
                <p>HTML, CSS, Flex, Grid, BEM, JavaScript, ReactJS, ES6, Command Line, Git, Git flow, AMP, Web components,
                    Regular expression, NodeJS+-;)</p>
                <div className="link__social">
                    <h4>More link</h4>
                    <span><a target="_blank" rel="noopener noreferrer" href="https://github.com/P0rt">GitHub</a></span>
                    <span><a target="_blank" rel="noopener noreferrer" href="https://www.linkedin.com/in/sergey-parfenov-721b25171/">LinkedIn</a></span>
                    <span><a target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/Duckambition">Facebook</a></span>
                </div>
                <p></p>
            </div>
        </Rnd>
        <Rnd
            id="resume"
            onClick={focusSkills}
            className="kek kek--second"
            default={{
                x: 300,
                y: 100,
                width: 809,
                // height: 458
            }}
        >
            <div className="line">
                <div className="line__ring">
                    <a className="line__ring--link" href="">?</a>
                </div>
            </div>
            <div className="block">
                <img className="images image--cover" src={logo} alt={"logo"}/>
                <div>
                <h3>Sergey Parfenov</h3>
                    <div>
                        <h4 className="header">Now i am</h4>
                        <p>Learning Specialist at <a target="_blank" rel="noopener noreferrer" href="https://www.yandex.ru/">Yandex</a></p>
                        <p>Teacher at <a target="_blank" rel="noopener noreferrer" href="https://kruzhok.io/">Kruzhok</a></p>
                    </div>
                    <div>
                        <h4 className="header">While ago i was</h4>
                        <p>Frontend developer at <a target="_blank" rel="noopener noreferrer" href="https://www.sravni.ru/">Sravni.ru</a></p>
                        <p>Frontend developer at <a target="_blank" rel="noopener noreferrer" href="">Spaces.ru</a></p>
                        <p>Teacher assistant at <a target="_blank" rel="noopener noreferrer" href="https://moscoding.ru/">Moscow Coding School</a></p>
                    </div>
                </div>
            </div>
        </Rnd>
    </div>
);

render(<App />, document.getElementById("root"));
