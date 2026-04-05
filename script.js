// ====================== FULL RESTORED DATA & LOGIC ======================

const formulaDetails = {
    regression: { title: "Marxman Solid Fuel Regression", content: `<p><strong>Equation:</strong> <code>ṙ = a · G<sub>ox</sub><sup>n</sup></code> where <code>G<sub>ox</sub> = ṁ<sub>ox</sub> / A<sub>port</sub></code>.</p><p><strong>Physical meaning:</strong> Regression rate <code>ṙ</code> (mm/s) is proportional to the oxidizer mass flux <code>G<sub>ox</sub></code> raised to power <code>n</code>. This model (Marxman–Gilbert) assumes turbulent boundary layer combustion controlled by convective heat transfer.</p><p><strong>Typical values:</strong> For paraffin–N₂O, <code>a ≈ 0.000095 m/s/(kg/m²s)ⁿ</code>, <code>n ≈ 0.62</code> (turbulent regime). <code>n</code> typically 0.5–0.8 for hybrid rockets.</p><p><strong>Assumptions:</strong> Steady-state, fully developed turbulent flow, negligible radiation, uniform port diameter.</p>` },
    chamber: { title: "Chamber Pressure (Mass Continuity)", content: `<p><strong>Equation:</strong> <code>P<sub>c</sub> = (ṁ<sub>total</sub> · c*) / A<sub>t</sub></code></p><p><strong>Physical meaning:</strong> Chamber pressure is determined by the total mass flow rate (<code>ṁ<sub>total</sub> = ṁ<sub>ox</sub> + ṁ<sub>f</sub></code>), the characteristic velocity <code>c*</code>, and the throat area <code>A<sub>t</sub></code>.</p><p><strong>Typical values:</strong> <code>c*</code> depends on propellant combination; for paraffin–N₂O ≈ 900–1000 m/s.</p><p><strong>Assumptions:</strong> Quasi-steady combustion, perfect gas, isentropic flow in nozzle, complete combustion.</p>` },
    thrust: { title: "Thrust Coefficient (Isentropic Nozzle)", content: `<p><strong>Equation:</strong> <code>C<sub>F</sub> = Γ·√[2γ/(γ-1)·(1-(P<sub>e</sub>/P<sub>c</sub>)<sup>(γ-1)/γ</sup>)] + (P<sub>e</sub>-P<sub>a</sub>)/P<sub>c</sub>·ε</code></p><p><code>Γ = √[γ·(2/(γ+1))<sup>(γ+1)/(γ-1)</sup>]</code>, <code>ε = A<sub>e</sub>/A<sub>t</sub></code>.</p><p><strong>Physical meaning:</strong> <code>C<sub>F</sub></code> amplifies chamber pressure to produce thrust. It accounts for both momentum thrust (first term) and pressure thrust (second term).</p><p><strong>Mach iteration:</strong> Exit Mach <code>M<sub>e</sub></code> solved from area ratio, then <code>P<sub>e</sub></code> from isentropic relation.</p>` },
    isp: { title: "Specific Impulse", content: `<p><strong>Equation:</strong> <code>I<sub>sp</sub> = F / (ṁ<sub>total</sub>·g<sub>0</sub>)</code> [s]</p><p><strong>Physical meaning:</strong> Measures rocket efficiency: seconds of thrust per unit propellant weight flow. Higher I<sub>sp</sub> means better performance.</p><p><strong>Typical values:</strong> Hybrid rockets: 200–300 s; our model gives ~220–260 s depending on O/F ratio.</p><p><strong>Relation:</strong> <code>I<sub>sp</sub> = (c*·C<sub>F</sub>) / g<sub>0</sub></code>, so it combines combustion efficiency and nozzle expansion.</p>` },
    transient: { title: "Transient Grain Burnback", content: `<p><strong>Equation:</strong> <code>d(d<sub>p</sub>)/dt = 2·ṙ</code> integrated numerically (Euler method).</p><p><strong>Physical meaning:</strong> Port diameter increases over time as fuel regresses. Transient simulation captures pressure drop as flow area increases.</p><p><strong>Implementation:</strong> At each time step, compute <code>ṙ</code> from current port area, update <code>d<sub>p</sub> = d<sub>p</sub> + 2·ṙ·Δt</code>, recalculate <code>P<sub>c</sub></code>.</p><p><strong>Assumptions:</strong> Constant oxidizer mass flow, uniform regression along grain, no erosive burning effects.</p>` },
    exp: { title: "Experimental Validation", content: `<p><strong>Equation:</strong> <code>d<sub>p,exp</sub> = √(d<sub>i</sub><sup>2</sup> + 4Δm<sub>fuel,exp</sub>/(π·L·ρ<sub>f</sub>))</code></p><p><strong>Physical meaning:</strong> Back‑calculates final port diameter from measured fuel mass loss. Assumes uniform grain geometry.</p><p><strong>Error metrics:</strong> Comparison between predicted and experimental regression rate, port diameter, fuel consumed, and chamber pressure. Error < 10% indicates good model calibration.</p><p><strong>IIT KGP Exp.1 reference:</strong> Paraffin+N₂O gave regression rate 1.651 mm/s, Pc 5.43 bar, c*_expt=925.25 m/s, combustion efficiency 87.4%.</p>` }
};

// Modal Handling
const formulaModal = document.getElementById('formulaModal');
const formulaModalBody = document.getElementById('modalBody');
const calcModal = document.getElementById('calcModal');
const calcModalBody = document.getElementById('calcModalBody');

document.querySelectorAll('.formula-card').forEach(c => c.addEventListener('click', e => { 
    e.stopPropagation(); 
    const key = c.getAttribute('data-formula'); 
    if(key && formulaDetails[key]) {
        formulaModalBody.innerHTML = `<h3><i class="fas fa-chalkboard-teacher"></i> ${formulaDetails[key].title}</h3>${formulaDetails[key].content}<hr><p style="font-size:0.75rem; color:#9ca3af; margin-top:1rem;">Click outside or ESC to close.</p>`; 
        formulaModal.style.display = 'flex'; 
    }
}));

document.getElementById('showCalcModalBtn').addEventListener('click', () => {
    if (window._lastCalcHtml) { calcModalBody.innerHTML = window._lastCalcHtml; } 
    else { calcModalBody.innerHTML = '<p>No calculations yet. Click "Compute & Compare" first.</p>'; }
    calcModal.style.display = 'flex';
});

// Close functionality for all modals
const modals = [document.getElementById('formulaModal'), document.getElementById('calcModal'), document.getElementById('plotModal')];
document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', function() { this.closest('.modal-overlay').style.display = 'none'; }));
window.addEventListener('click', e => { modals.forEach(m => { if(e.target === m) m.style.display = 'none'; }); });
window.addEventListener('keydown', e => { if(e.key === 'Escape') modals.forEach(m => m.style.display = 'none'); });

// Math & Physics Functions
function computeMachFromAreaRatio(areaRatio, gamma) {
    let M = areaRatio > 10 ? 3.2 : (areaRatio > 4 ? 2.4 : 1.5);
    for(let i=0; i<70; i++) {
        const term = 1 + 0.5*(gamma-1)*M*M;
        const exponent = (gamma+1)/(2*(gamma-1));
        const factor = (2/(gamma+1))*term;
        const value = (1/M)*Math.pow(factor, exponent);
        const f = value - areaRatio;
        if(Math.abs(f)<1e-8) break;
        const dFactor_dM = (2/(gamma+1))*(gamma-1)*M;
        const dPow = exponent * Math.pow(factor, exponent-1) * dFactor_dM;
        const dValue_dM = (-1/(M*M))*Math.pow(factor, exponent) + (1/M)*dPow;
        if(dValue_dM===0) break;
        M = M - f/dValue_dM;
        M = Math.min(8.0, Math.max(0.2, M));
    }
    return M;
}

function computeThrustCoefficient(eps, gamma, Pc, Pa) {
    const Me = computeMachFromAreaRatio(eps, gamma);
    const Pe = Pc * Math.pow(1 + 0.5*(gamma-1)*Me*Me, -gamma/(gamma-1));
    const term1 = Math.sqrt((2*gamma*gamma/(gamma-1)) * Math.pow(2/(gamma+1),(gamma+1)/(gamma-1)) * (1 - Math.pow(Pe/Pc,(gamma-1)/gamma)));
    const term2 = (Pe-Pa)/Pc * eps;
    return term1 + term2;
}

function computeInstantaneous(mdot_ox, rho_f, L_m, d_port_m, a, n, dt_mm, eps, gamma, cstar, p_amb, g0) {
    const A_port = Math.PI * (d_port_m/2)*(d_port_m/2);
    const A_throat = Math.PI * Math.pow(dt_mm/2000,2);
    const Gox = mdot_ox / A_port;
    const r_dot = a * Math.pow(Gox, n);
    const S_burn = Math.PI * d_port_m * L_m;
    const mdot_fuel = r_dot * S_burn * rho_f;
    const mdot_total = mdot_ox + mdot_fuel;
    const Pc = (mdot_total * cstar) / A_throat;
    const Cf = computeThrustCoefficient(eps, gamma, Pc, p_amb);
    const thrust = Cf * A_throat * Pc;
    const Isp = thrust / (mdot_total * g0);
    return { Pc, thrust, Isp, mdot_fuel, mdot_total, Gox, r_dot, Cf, A_port, A_throat, S_burn };
}

// Full Reconstructed HTML Table Generation
function generateCalculationHtml(res, mdot_ox, rho_f, L_m, d_i_m, a_reg, n_reg, dt_mm, eps, gamma_val, cstar_val, p_amb_val, g0_val, avg_regression, total_fuel_consumed, exp_regression, exp_fuel_used_kg, exp_final_diam_m, vol_slpm, rho_ox_amb_gl, t_burn) {
    const A_port_m2 = res.A_port;
    const A_throat_m2 = res.A_throat;
    const Gox = res.Gox;
    const r_dot_mm = res.r_dot * 1000;
    const S_burn_m2 = res.S_burn;
    const mdot_fuel_gs = res.mdot_fuel * 1000;
    const mdot_total_gs = (mdot_ox + res.mdot_fuel) * 1000;
    const Cf = res.Cf;
    const thrust_N = res.thrust;
    const Isp_s = res.Isp;
    const Pc_bar = res.Pc / 1e5;
    const O_ratio = mdot_ox / res.mdot_fuel;
    const exp_reg_mm = exp_regression * 1000;
    const exp_fuel_g = exp_fuel_used_kg * 1000;
    const exp_port_mm = exp_final_diam_m * 1000;
    const model_port_mm = (Math.sqrt(d_i_m*d_i_m + (4*total_fuel_consumed)/(rho_f*Math.PI*L_m))) * 1000;
    const efficiency = (cstar_val / 1058) * 100;

    return `<table>
          <tr><td><strong>1. Oxidizer mass flow</strong><br>ṁₒₓ = SLPM × ρₒₓ / 1000 / 60</td><td>${vol_slpm} × ${rho_ox_amb_gl} / 1000 / 60 = <strong>${(mdot_ox*1000).toFixed(2)} g/s</strong> (${mdot_ox.toFixed(5)} kg/s)</td></tr>
          <tr><td><strong>2. Port area (initial)</strong><br>A_port = π·(d_i/2)²</td><td>π × ${(d_i_m*1000).toFixed(1)}/2)² = ${A_port_m2.toExponential(4)} m²</td></tr>
          <tr><td><strong>3. Oxidizer mass flux</strong><br>Gₒₓ = ṁₒₓ / A_port</td><td>${mdot_ox.toFixed(5)} / ${A_port_m2.toExponential(4)} = <strong>${Gox.toFixed(1)} kg/m²s</strong></td></tr>
          <tr><td><strong>4. Regression rate</strong><br>ṙ = a · Gₒₓⁿ</td><td>${a_reg.toExponential(2)} × ${Gox.toFixed(1)}<sup>${n_reg}</sup> = <strong>${r_dot_mm.toFixed(3)} mm/s</strong> (${res.r_dot.toExponential(4)} m/s)</td></tr>
          <tr><td><strong>5. Burning surface area</strong><br>A_b = π·d_i·L</td><td>π × ${(d_i_m*1000).toFixed(1)} × ${(L_m*1000).toFixed(0)} = ${S_burn_m2.toExponential(4)} m²</td></tr>
          <tr><td><strong>6. Fuel mass flow</strong><br>ṁ_f = ρ_f · ṙ · A_b</td><td>${rho_f} × ${res.r_dot.toExponential(4)} × ${S_burn_m2.toExponential(4)} = <strong>${mdot_fuel_gs.toFixed(2)} g/s</strong></td></tr>
          <tr><td><strong>7. Total mass flow</strong><br>ṁ_total = ṁₒₓ + ṁ_f</td><td>${(mdot_ox*1000).toFixed(2)} + ${mdot_fuel_gs.toFixed(2)} = <strong>${mdot_total_gs.toFixed(2)} g/s</strong></td></tr>
          <tr><td><strong>8. Throat area</strong><br>A_t = π·(d_t/2)²</td><td>π × (${dt_mm}/2)² = ${A_throat_m2.toExponential(4)} m²</td></tr>
          <tr><td><strong>9. Chamber pressure</strong><br>P_c = (ṁ_total · c*) / A_t</td><td>(${mdot_total_gs/1000} × ${cstar_val}) / ${A_throat_m2.toExponential(4)} = <strong>${Pc_bar.toFixed(2)} bar</strong> (${res.Pc.toFixed(0)} Pa)</td></tr>
          <tr><td><strong>10. Thrust coefficient</strong><br>C_F = f(γ, ε, P_c/P_a)</td><td>γ=${gamma_val}, ε=${eps}, P_c/P_a=${(res.Pc/p_amb_val).toFixed(2)} → <strong>${Cf.toFixed(4)}</strong></td></tr>
          <tr><td><strong>11. Thrust</strong><br>F = C_F · A_t · P_c</td><td>${Cf.toFixed(4)} × ${A_throat_m2.toExponential(4)} × ${res.Pc.toFixed(0)} = <strong>${thrust_N.toFixed(2)} N</strong></td></tr>
          <tr><td><strong>12. Specific impulse</strong><br>I_sp = F / (ṁ_total · g₀)</td><td>${thrust_N.toFixed(2)} / (${mdot_total_gs/1000} × ${g0_val}) = <strong>${Isp_s.toFixed(1)} s</strong></td></tr>
          <tr><td><strong>13. Oxidizer/fuel ratio</strong><br>O/F = ṁₒₓ / ṁ_f</td><td>${mdot_ox.toFixed(5)} / ${res.mdot_fuel.toFixed(5)} = <strong>${O_ratio.toFixed(3)}</strong></td></tr>
          <tr><td><strong>14. Regression rate (avg, model)</strong><br>ṙ_avg = (d_final - d_i) / (2·t)</td><td>(${model_port_mm.toFixed(2)} - ${(d_i_m*1000).toFixed(1)}) / (2×${t_burn}) = <strong>${avg_regression*1000} mm/s</strong></td></tr>
          <tr><td><strong>15. Experimental comparison</strong><br>Regression rate (exp) = ${exp_reg_mm.toFixed(3)} mm/s<br>Fuel consumed (exp) = ${exp_fuel_g.toFixed(1)} g<br>Final port (exp) = ${exp_port_mm.toFixed(2)} mm</td><td>Model regression error: ${((avg_regression*1000 - exp_reg_mm)/exp_reg_mm*100).toFixed(1)}%<br>Model fuel error: ${((total_fuel_consumed*1000 - exp_fuel_g)/exp_fuel_g*100).toFixed(1)}%<br>Model port error: ${((model_port_mm - exp_port_mm)/exp_port_mm*100).toFixed(1)}%</td></tr>
          <tr><td><strong>16. Combustion efficiency (η<sub>C*</sub>)</strong><br>c*_exp / c*_theo (NASA CEA)</td><td>${cstar_val.toFixed(1)} / 1058 = <strong>${efficiency.toFixed(1)}%</strong></td></tr>
     </table>`;
}

// Global scope vars
let perfChart=null, regLogLogChart=null, pcTimeChart=null, mdotTimeChart=null;
let perfToggleState = [true, true, true];
let regToggleState = [true, true];

function updateAll() {
    let L_m = parseFloat(document.getElementById('L_mm').value)/1000;
    let d_i_m = parseFloat(document.getElementById('d_i_mm').value)/1000;
    let m_i_kg = parseFloat(document.getElementById('m_init_g').value)/1000;
    let m_f_kg = parseFloat(document.getElementById('m_final_g').value)/1000;
    let rho_f = parseFloat(document.getElementById('rho_fuel').value);
    let vol_slpm = parseFloat(document.getElementById('vol_flow_slpm').value);
    let rho_ox_amb_gl = parseFloat(document.getElementById('rho_ox_amb').value);
    let dt_mm = parseFloat(document.getElementById('throat_diam_mm').value);
    let t_burn = parseFloat(document.getElementById('run_time').value);
    let a_reg = parseFloat(document.getElementById('reg_a').value);
    let n_reg = parseFloat(document.getElementById('reg_n').value);
    let eps = parseFloat(document.getElementById('eps_exp').value);
    let gamma_val = parseFloat(document.getElementById('gamma').value);
    let cstar_val = parseFloat(document.getElementById('cstar').value);
    let p_amb_val = parseFloat(document.getElementById('p_amb').value);
    let g0_val = parseFloat(document.getElementById('g0').value);

    // Initial calcs
    let mdot_ox = vol_slpm * rho_ox_amb_gl / 1000 / 60;
    const A_port_i = Math.PI * (d_i_m / 2) * (d_i_m / 2);
    const Gox_i = mdot_ox / A_port_i;
    const res_i = computeInstantaneous(mdot_ox, rho_f, L_m, d_i_m, a_reg, n_reg, dt_mm, eps, gamma_val, cstar_val, p_amb_val, g0_val);

    // Transient loop
    let d_port = d_i_m, dt = 0.05, total_fuel_consumed = 0;
    for (let t = 0; t <= t_burn; t += dt) {
        const A_port = Math.PI * (d_port / 2) * (d_port / 2);
        const Gox = mdot_ox / A_port;
        const r_dot = a_reg * Math.pow(Gox, n_reg);
        const S_burn = Math.PI * d_port * L_m;
        total_fuel_consumed += r_dot * S_burn * rho_f * dt;
        d_port += 2 * r_dot * dt;
        if (d_port > 0.2) break;
    }

    // Comparison Metrics
    const predicted_final_port_m = d_port;
    const avg_regression = (predicted_final_port_m - d_i_m) / (2 * t_burn);
    const exp_fuel_used_kg = m_i_kg - m_f_kg;
    const exp_final_diam_m = Math.sqrt(d_i_m * d_i_m + (4 * exp_fuel_used_kg) / (rho_f * Math.PI * L_m));
    const exp_regression = (exp_final_diam_m - d_i_m) / (2 * t_burn);
    const res_steady = computeInstantaneous(mdot_ox, rho_f, L_m, d_i_m, a_reg, n_reg, dt_mm, eps, gamma_val, cstar_val, p_amb_val, g0_val);
    const Pc_bar = res_steady.Pc / 1e5;

    // DOM Updates
    document.getElementById('res_pc').innerHTML = `${Pc_bar.toFixed(2)} bar`;
    document.getElementById('res_thrust').innerHTML = `${res_steady.thrust.toFixed(2)} N`;
    document.getElementById('res_isp').innerHTML = `${res_steady.Isp.toFixed(1)} s`;

    document.getElementById('extra_metrics').innerHTML = `
        <span><strong>ṁₒₓ:</strong> ${(mdot_ox*1000).toFixed(2)} g/s</span>
        <span><strong>Gₒₓ:</strong> ${Gox_i.toFixed(1)} kg/m²s</span>
        <span><strong>ṙ₀:</strong> ${(res_i.r_dot*1000).toFixed(3)} mm/s</span>
        <span><strong>ṙ_avg:</strong> ${(avg_regression*1000).toFixed(3)} mm/s</span>
        <span><strong>C<sub>F</sub>:</strong> ${res_steady.Cf.toFixed(4)}</span>
        <span><strong>O/F:</strong> ${(mdot_ox/res_steady.mdot_fuel).toFixed(3)}</span>
    `;

    document.getElementById('comparisonTable').innerHTML = `
        <div class="comparison-item"><span><strong>Parameter</strong></span><span><strong>Exp.1</strong></span><span><strong>Model</strong></span><span><strong>Error</strong></span></div>
        <div class="comparison-item"><span>Regression (mm/s)</span><span>1.651</span><span>${(avg_regression*1000).toFixed(3)}</span><span>${((avg_regression-0.001651)/0.001651*100).toFixed(1)}%</span></div>
        <div class="comparison-item"><span>Final port (mm)</span><span>26.51</span><span>${(predicted_final_port_m*1000).toFixed(2)}</span><span>${((predicted_final_port_m-0.02651)/0.02651*100).toFixed(1)}%</span></div>
        <div class="comparison-item"><span>Fuel used (g)</span><span>42.6</span><span>${(total_fuel_consumed*1000).toFixed(1)}</span><span>${((total_fuel_consumed-0.0426)/0.0426*100).toFixed(1)}%</span></div>
        <div class="comparison-item"><span>Pc (bar)</span><span>5.43</span><span>${Pc_bar.toFixed(2)}</span><span>${((Pc_bar-5.43)/5.43*100).toFixed(1)}%</span></div>
        <div class="comparison-item"><span>c* (m/s)</span><span>925.3</span><span>${cstar_val.toFixed(1)}</span><span>${((cstar_val-925.25)/925.25*100).toFixed(1)}%</span></div>
    `;

    window._lastCalcHtml = generateCalculationHtml(res_steady, mdot_ox, rho_f, L_m, d_i_m, a_reg, n_reg, dt_mm, eps, gamma_val, cstar_val, p_amb_val, g0_val, avg_regression, total_fuel_consumed, exp_regression, exp_fuel_used_kg, exp_final_diam_m, vol_slpm, rho_ox_amb_gl, t_burn);
    
    // Store globally for transient/sweep
    window._simState = { mdot_ox, rho_f, L_m, d_i_m, a_reg, n_reg, dt_mm, eps, gamma_val, cstar_val, p_amb_val, g0_val, t_burn };
}

function runTransient() {
    if(!window._simState) return;
    const { mdot_ox, rho_f, L_m, dt_mm, eps, gamma_val, cstar_val, p_amb_val, g0_val, t_burn, a_reg, n_reg, d_i_m } = window._simState;
    let d_port = d_i_m, dt = 0.05, timePoints=[], pcPoints=[], mdotOxPoints=[], t=0;
    const A_throat = Math.PI * Math.pow(dt_mm/2000, 2);
    
    while(t <= t_burn + dt/2) {
        const A_port = Math.PI * (d_port/2) * (d_port/2);
        const Gox = mdot_ox / A_port;
        const r_dot = a_reg * Math.pow(Gox, n_reg);
        const S_burn = Math.PI * d_port * L_m;
        const mdot_fuel = r_dot * S_burn * rho_f;
        const mdot_total = mdot_ox + mdot_fuel;
        
        // BUG FIX: Changed 'cstar' to 'cstar_val' to correctly reference the destructured variable
        const Pc = (mdot_total * cstar_val) / A_throat; 
        
        timePoints.push(t); pcPoints.push(Pc/1e5); mdotOxPoints.push(mdot_ox*1000);
        d_port += 2 * r_dot * dt; t += dt; 
        if(d_port > 0.2) break;
    }

    if(pcTimeChart) pcTimeChart.destroy(); 
    if(mdotTimeChart) mdotTimeChart.destroy();
    
    pcTimeChart = new Chart(document.getElementById('pcTimePlot').getContext('2d'), {
        type:'line', data: { labels: timePoints.map(v=>v.toFixed(1)), datasets: [{ label:'Pc (bar)', data: pcPoints, borderColor:'#3b82f6', tension:0.2, fill:false, pointRadius:0 }] },
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ color:'#ccc' } } } }
    });
    mdotTimeChart = new Chart(document.getElementById('mdotTimePlot').getContext('2d'), {
        type:'line', data: { labels: timePoints.map(v=>v.toFixed(1)), datasets: [{ label:'ṁₒₓ (g/s)', data: mdotOxPoints, borderColor:'#10b981', tension:0.2, fill:false, pointRadius:0 }] },
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ color:'#ccc' } } } }
    });
}

function generateSweepData() {
    if(!window._simState) return null;
    const { rho_f, L_m, d_i_m, a_reg, n_reg, dt_mm, eps, gamma_val, cstar_val, p_amb_val, g0_val } = window._simState;
    const points=45, mdot_min=0.001, mdot_max=0.025; 
    let mdot_arr=[], Pc_arr=[], thrust_arr=[], Isp_arr=[], Gox_arr=[], rdot_arr=[];
    for(let i=0; i<=points; i++) { 
        let mdot_ox = mdot_min + (mdot_max-mdot_min)*(i/points); 
        try { 
            const res = computeInstantaneous(mdot_ox, rho_f, L_m, d_i_m, a_reg, n_reg, dt_mm, eps, gamma_val, cstar_val, p_amb_val, g0_val); 
            mdot_arr.push(mdot_ox); Pc_arr.push(res.Pc/1e5); thrust_arr.push(res.thrust); Isp_arr.push(res.Isp); Gox_arr.push(res.Gox); rdot_arr.push(res.r_dot*1000); 
        } catch(e){} 
    }
    return {mdot_arr, Pc_arr, thrust_arr, Isp_arr, Gox_arr, rdot_arr};
}

function updatePlots() {
    const data = generateSweepData();
    if(!data) return;
    
    if(perfChart) perfChart.destroy();
    perfChart = new Chart(document.getElementById('perfPlot').getContext('2d'), {
        type: 'line',
        data: {
            labels: data.mdot_arr.map(v => v.toFixed(3)),
            datasets: [
                { label: 'Pc (bar)', data: data.Pc_arr, borderColor: '#3b82f6', tension: 0.2, pointRadius: 0, yAxisID: 'y', hidden: !perfToggleState[0] },
                { label: 'Thrust (N)', data: data.thrust_arr, borderColor: '#f59e0b', tension: 0.2, pointRadius: 0, yAxisID: 'y1', hidden: !perfToggleState[1] },
                { label: 'Isp (s)', data: data.Isp_arr, borderColor: '#10b981', tension: 0.2, borderDash: [5,4], pointRadius: 0, yAxisID: 'y2', hidden: !perfToggleState[2] }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#ccc' } } },
            scales: { x: { title: { display: true, text: 'ṁₒₓ (kg/s)' } }, y: { position: 'left', title: { text: 'Pressure (bar)' } }, y1: { position: 'right', grid: { drawOnChartArea: false }, title: { text: 'Thrust (N)' } }, y2: { position: 'right', grid: { drawOnChartArea: false }, title: { text: 'Isp (s)' } } }
        }
    });

    if(regLogLogChart) regLogLogChart.destroy();
    const Gox_vals = data.Gox_arr.filter(v => v > 0);
    const rdot_vals = data.rdot_arr.filter((_, i) => data.Gox_arr[i] > 0);
    const theory = Gox_vals.map(g => (window._simState.a_reg * Math.pow(g, window._simState.n_reg)) * 1000);
    
    regLogLogChart = new Chart(document.getElementById('regPlotLogLog').getContext('2d'), {
        type: 'scatter',
        data: {
            datasets: [
                { label: 'Model predictions', data: Gox_vals.map((g, i) => ({ x: g, y: rdot_vals[i] })), borderColor: '#f97316', backgroundColor: '#f97316', pointRadius: 3, hidden: !regToggleState[0] },
                { label: 'Theory a·Gⁿ', data: Gox_vals.map((g, i) => ({ x: g, y: theory[i] })), borderColor: '#fff', borderDash: [5,5], pointRadius: 0, type: 'line', hidden: !regToggleState[1] }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'logarithmic', title: { text: 'Gₒₓ' } }, y: { type: 'logarithmic', title: { text: 'ṙ (mm/s)' } } } }
    });

    attachToggleListeners();
}

function attachToggleListeners() {
    document.querySelectorAll('#perfToggles .toggle-btn').forEach((btn, idx) => {
        btn.removeEventListener('click', perfToggleHandler); btn.addEventListener('click', perfToggleHandler);
    });
    document.querySelectorAll('#regToggles .toggle-btn').forEach((btn, idx) => {
        btn.removeEventListener('click', regToggleHandler); btn.addEventListener('click', regToggleHandler);
    });
}
function perfToggleHandler(e) { const idx = parseInt(e.currentTarget.getAttribute('data-dataset')); perfToggleState[idx] = !perfToggleState[idx]; if (perfChart) { perfChart.data.datasets[idx].hidden = !perfToggleState[idx]; perfChart.update(); } e.currentTarget.classList.toggle('active', perfToggleState[idx]); }
function regToggleHandler(e) { const idx = parseInt(e.currentTarget.getAttribute('data-dataset')); regToggleState[idx] = !regToggleState[idx]; if (regLogLogChart) { regLogLogChart.data.datasets[idx].hidden = !regToggleState[idx]; regLogLogChart.update(); } e.currentTarget.classList.toggle('active', regToggleState[idx]); }

// Enlarged Plots
let enlargedChart=null;
document.querySelectorAll('.plot-card').forEach(c => c.addEventListener('click', e => {
    // Only trigger if we aren't clicking a button inside the card
    if(e.target.tagName.toLowerCase() === 'button') return; 
    
    const plotType = c.getAttribute('data-plot'); 
    let chartData = null, title = '';
    
    if(plotType==='transient') { 
        title = 'Chamber Pressure vs Time'; 
        chartData = {labels: pcTimeChart.data.labels, datasets:[{label:'Chamber Pressure (bar)', data:pcTimeChart.data.datasets[0].data, borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.1)', fill:true, tension:0.2}]}; 
    }
    else if(plotType==='sweep') { 
        title = 'Performance vs. Oxidizer Mass Flow'; 
        chartData = JSON.parse(JSON.stringify(perfChart.data)); // Deep copy data 
    }
    else if(plotType==='regression') { 
        title = 'Marxman Regression (log‑log)'; 
        chartData = JSON.parse(JSON.stringify(regLogLogChart.data)); 
    }
    else if(plotType==='transientOx') { 
        title = 'Oxidizer Mass Flow (constant)'; 
        chartData = JSON.parse(JSON.stringify(mdotTimeChart.data)); 
    }
    
    if(!chartData) return;
    document.getElementById('plotModalTitle').innerText = title; 
    document.getElementById('plotModal').style.display='flex';
    if(enlargedChart) enlargedChart.destroy();
    
    const ctx = document.getElementById('enlargedCanvas').getContext('2d');
    if(plotType==='regression') {
        enlargedChart = new Chart(ctx, {type:'scatter', data:chartData, options:{responsive:true, maintainAspectRatio:false, scales:{x:{type:'logarithmic', title:{display:true, text:'Gₒₓ'}}, y:{type:'logarithmic', title:{display:true, text:'Regression rate ṙ (mm/s)'}}}, plugins:{legend:{labels:{color:'#fff'}}}}});
    } else if(plotType==='sweep') {
        enlargedChart = new Chart(ctx, {type:'line', data:chartData, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{labels:{color:'#fff'}}}, scales:{x:{title:{display:true, text:'Oxidizer mass flow (kg/s)'}}, y:{position:'left', title:{text:'Pressure (bar)'}}, y1:{position:'right', grid:{drawOnChartArea:false}, title:{text:'Thrust (N)'}}, y2:{position:'right', grid:{drawOnChartArea:false}, title:{text:'Isp (s)'}}}}});
    } else {
        enlargedChart = new Chart(ctx, {type:'line', data:chartData, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{labels:{color:'#fff'}}}, scales:{x:{title:{display:true, text:'Time (s)'}}, y:{title:{display:true, text:plotType==='transient'?'Pressure (bar)':'Flow (g/s)'}}}}});
    }
}));


// Fully Restored Open Plots Window (Popup Feature)
document.getElementById('openPlotsWindowBtn').addEventListener('click', () => {
    updateAll(); runTransient(); updatePlots();
    
    let transientTime = [], transientPressure = [];
    if (window._simState) {
        const { mdot_ox, rho_f, L_m, dt_mm, cstar_val, t_burn, a_reg, n_reg, d_i_m } = window._simState;
        let d_port = d_i_m, dt = 0.05, t = 0;
        const A_throat = Math.PI * Math.pow(dt_mm / 2000, 2);
        while (t <= t_burn + dt / 2) {
            const A_port = Math.PI * (d_port / 2) * (d_port / 2);
            const Gox = mdot_ox / A_port;
            const r_dot = a_reg * Math.pow(Gox, n_reg);
            const S_burn = Math.PI * d_port * L_m;
            const mdot_fuel = r_dot * S_burn * rho_f;
            const Pc = ((mdot_ox + mdot_fuel) * cstar_val) / A_throat;
            transientTime.push(t); transientPressure.push(Pc / 1e5);
            d_port += 2 * r_dot * dt; t += dt;
            if (d_port > 0.2) break;
        }
    }

    const sweepData = generateSweepData();
    const transientDataJson = JSON.stringify({ time: transientTime, pressure: transientPressure });
    const sweepDataJson = JSON.stringify(sweepData);

    const win = window.open('', '_blank', 'width=1200,height=800,resizable=yes,scrollbars=yes');
    if (!win) { alert("Popup blocked. Please allow popups."); return; }

    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hybrid Rocket Plots - Exp.1</title>
            <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
            <style>
                body { font-family: 'Inter', sans-serif; background: #0A0F1A; color: #E9EDF5; padding: 2rem; margin: 0; }
                .container { max-width: 1400px; margin: 0 auto; }
                h1 { text-align: center; margin-bottom: 2rem; background: linear-gradient(135deg, #fff, #90cdf4); -webkit-background-clip: text; background-clip: text; color: transparent; }
                .plot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 2rem; }
                .plot-card { background: rgba(18, 25, 40, 0.8); border-radius: 1rem; padding: 1rem; border: 1px solid #3b82f6; }
                canvas { width: 100% !important; height: auto !important; max-height: 400px; }
                .footer { text-align: center; margin-top: 2rem; font-size: 0.8rem; color: #9ca3af; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1><i class="fas fa-rocket"></i> Hybrid Rocket Performance Plots (Exp.1)</h1>
                <div class="plot-grid">
                    <div class="plot-card">
                        <h3>Chamber Pressure vs Time</h3>
                        <canvas id="transientPlot"></canvas>
                    </div>
                    <div class="plot-card">
                        <h3>Performance vs. Oxidizer Flow</h3>
                        <canvas id="sweepPlot"></canvas>
                    </div>
                    <div class="plot-card">
                        <h3>Marxman Regression (log‑log)</h3>
                        <canvas id="regressionPlot"></canvas>
                    </div>
                </div>
                <div class="footer">Based on IIT KGP Experiment 1 parameters. Close this window to return.</div>
            </div>
            <script>
                const transientData = ${transientDataJson};
                const sweepData = ${sweepDataJson};
                new Chart(document.getElementById('transientPlot'), {
                    type: 'line', data: { labels: transientData.time.map(v => v.toFixed(2)), datasets: [{ label: 'Pc (bar)', data: transientData.pressure, borderColor: '#3b82f6', fill: true, tension: 0.2 }] },
                    options: { responsive: true, scales: { x: { title: { display: true, text: 'Time (s)' } }, y: { title: { display: true, text: 'Pressure (bar)' } } } }
                });
                new Chart(document.getElementById('sweepPlot'), {
                    type: 'line', data: { labels: sweepData.mdot_arr.map(v => v.toFixed(3)), datasets: [ { label: 'Pc (bar)', data: sweepData.Pc_arr, borderColor: '#3b82f6', yAxisID: 'y' }, { label: 'Thrust (N)', data: sweepData.thrust_arr, borderColor: '#f59e0b', yAxisID: 'y1' }, { label: 'Isp (s)', data: sweepData.Isp_arr, borderColor: '#10b981', borderDash: [5,4], yAxisID: 'y2' } ] },
                    options: { responsive: true, scales: { x: { title: { text: 'ṁₒₓ (kg/s)' } }, y: { position: 'left', title: { text: 'Pressure (bar)' } }, y1: { position: 'right', grid: { drawOnChartArea: false }, title: { text: 'Thrust (N)' } }, y2: { position: 'right', grid: { drawOnChartArea: false }, title: { text: 'Isp (s)' } } } }
                });
                const Gox_vals = sweepData.Gox_arr.filter(v => v > 0);
                const rdot_vals = sweepData.rdot_arr.filter((_, i) => sweepData.Gox_arr[i] > 0);
                const a_reg = ${parseFloat(document.getElementById('reg_a').value || 0.000095)};
                const n_reg = ${parseFloat(document.getElementById('reg_n').value || 0.62)};
                const theory = Gox_vals.map(g => (a_reg * Math.pow(g, n_reg)) * 1000);
                new Chart(document.getElementById('regressionPlot'), {
                    type: 'scatter', data: { datasets: [ { label: 'Model predictions', data: Gox_vals.map((g, i) => ({ x: g, y: rdot_vals[i] })), borderColor: '#f97316', pointRadius: 4, showLine: false }, { label: 'Theory a·Gⁿ', data: Gox_vals.map((g, i) => ({ x: g, y: theory[i] })), borderColor: '#fff', borderWidth: 2, borderDash: [5,5], pointRadius: 0, type: 'line' } ] },
                    options: { scales: { x: { type: 'logarithmic', title: { text: 'Gₒₓ (kg/m²s)' } }, y: { type: 'logarithmic', title: { text: 'ṙ (mm/s)' } } } }
                });
            <\/script>
        </body>
        </html>
    `);
    win.document.close();
});

// Event Listeners for main buttons
document.getElementById('computeBtn').addEventListener('click', () => { updateAll(); runTransient(); updatePlots(); });
document.getElementById('updatePlotsBtn').addEventListener('click', updatePlots);
document.getElementById('runTransientBtn').addEventListener('click', runTransient);
document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('L_mm').value = 100; document.getElementById('d_i_mm').value = 10;
    document.getElementById('m_init_g').value = 99.2; document.getElementById('m_final_g').value = 56.6;
    document.getElementById('rho_fuel').value = 900; document.getElementById('vol_flow_slpm').value = 263;
    document.getElementById('rho_ox_amb').value = 1.842; document.getElementById('throat_diam_mm').value = 6;
    document.getElementById('run_time').value = 5; document.getElementById('reg_a').value = 0.000095;
    document.getElementById('reg_n').value = 0.62; document.getElementById('eps_exp').value = 4;
    document.getElementById('gamma').value = 1.15; document.getElementById('cstar').value = 925.25;
    document.getElementById('p_amb').value = 101325; document.getElementById('g0').value = 9.81;
    updateAll(); runTransient(); updatePlots();
});

// Init
window.addEventListener('DOMContentLoaded', () => { updateAll(); runTransient(); updatePlots(); });