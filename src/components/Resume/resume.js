import React from "react";
import { Rnd } from "react-rnd";
import logo from '../../img/logo.jpg';
import { data } from '../Content/content';

import './resume.css';

const focusSkills = () => {
    document.getElementById('resume').style.zIndex = 1;
    document.getElementById('skills').style.zIndex = -1;
}

const focusResume = () => {
    document.getElementById('resume').style.zIndex = -1;
    document.getElementById('skills').style.zIndex = 1;
}

export const Block = () => (
<section>
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
                {/* <a className="line__ring--link" href="">?</a> */}
        </div>
        </div>
        <div className="header__kek">
            <h3>Technical skills</h3>
            <p>{data}</p>
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
            width: 809
        }}
    >
        <div className="line">
            <div className="line__ring">
                {/* <a className="line__ring--link" href="">?</a> */}
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
                    <p>Frontend developer at <a target="_blank" rel="noopener noreferrer" href="https://www.spaces-city.ru/">Spaces.ru</a></p>
                    <p>Teacher assistant at <a target="_blank" rel="noopener noreferrer" href="https://moscoding.ru/">Moscow Coding School</a></p>
                </div>
            </div>
        </div>
    </Rnd>
</section>
);