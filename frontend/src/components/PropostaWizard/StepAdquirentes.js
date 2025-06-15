// src/components/PropostaWizard/StepAdquirentes.js
import React from 'react';
import './StepAdquirentes.css'; // Criaremos este CSS
import './WizardSteps.css';

const ESTADO_CIVIL_OPCOES = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União Estável", "Outro"];

function StepAdquirentes({ formData, setFormData }) {
    // Handler para mudar campos do adquirente principal
    const handlePrincipalChange = (e) => {
        const { name, value } = e.target;
        const adquirentes = [...formData.adquirentes];
        if (adquirentes[0]) {
            adquirentes[0] = { ...adquirentes[0], [name]: value };
            setFormData(prev => ({ ...prev, adquirentes }));
        }
    };

    // Handler para mudar campos de um coadquirente específico
    const handleCoadquirenteChange = (index, e) => {
        const { name, value } = e.target;
        const adquirentes = [...formData.adquirentes];
        const coadquirenteIndex = index + 1;
        if (adquirentes[coadquirenteIndex]) {
            adquirentes[coadquirenteIndex] = { ...adquirentes[coadquirenteIndex], [name]: value };
            setFormData(prev => ({ ...prev, adquirentes }));
        }
    };

    // Handler para adicionar um novo coadquirente
    const handleAddCoadquirente = () => {
        setFormData({
            ...formData,
            adquirentes: [
                ...formData.adquirentes,
                { nome: '', cpf: '', rg: '', nacionalidade: 'Brasileiro(a)', estadoCivil: '', profissao: '' } // Novo coadquirente vazio
            ]
        });
    };

    // Handler para remover um coadquirente
    const handleRemoveCoadquirente = (index) => {
        const adquirentes = [...formData.adquirentes];
        // O índice para coadquirentes no array é 'index + 1'
        adquirentes.splice(index + 1, 1);
        setFormData({ ...formData, adquirentes });
    };

    const adquirentePrincipal = formData.adquirentes?.[0] || {};
    const coadquirentes = formData.adquirentes?.slice(1) || [];

    return (
        <div className="wizard-step">
            <h3>Etapa 1: Adquirentes</h3>
            
            <div className="adquirente-form-section principal">
                <h4>Adquirente Principal</h4>
                {/* --- Linha 1: Nome, CPF --- */}
                <div className="form-row">
                    <div className="form-group"><label>Nome Completo*</label><input type="text" name="nome" value={adquirentePrincipal.nome || ''} onChange={handlePrincipalChange} required /></div>
                    <div className="form-group"><label>CPF</label><input type="text" name="cpf" value={adquirentePrincipal.cpf || ''} onChange={handlePrincipalChange} /></div>
                </div>
                {/* --- Linha 2: RG, Nascimento --- */}
                <div className="form-row">
                    <div className="form-group"><label>RG</label><input type="text" name="rg" value={adquirentePrincipal.rg || ''} onChange={handlePrincipalChange} /></div>
                    <div className="form-group"><label>Data de Nascimento</label><input type="date" name="nascimento" value={adquirentePrincipal.nascimento ? new Date(adquirentePrincipal.nascimento).toISOString().split('T')[0] : ''} onChange={handlePrincipalChange} /></div>
                </div>
                {/* --- Linha 3: Estado Civil, Profissão --- */}
                <div className="form-row">
                    <div className="form-group"><label>Estado Civil</label><select name="estadoCivil" value={adquirentePrincipal.estadoCivil || ''} onChange={handlePrincipalChange}><option value="">Selecione...</option>{ESTADO_CIVIL_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                    <div className="form-group"><label>Profissão</label><input type="text" name="profissao" value={adquirentePrincipal.profissao || ''} onChange={handlePrincipalChange} /></div>
                </div>
                {/* --- Linha 4: Contato, Email --- */}
                <div className="form-row">
                    <div className="form-group"><label>Telefone de Contato*</label><input type="tel" name="contato" value={adquirentePrincipal.contato || ''} onChange={handlePrincipalChange} required /></div>
                    <div className="form-group"><label>Email</label><input type="email" name="email" value={adquirentePrincipal.email || ''} onChange={handlePrincipalChange} /></div>
                </div>
                {/* --- Linha 5: Endereço --- */}
                <div className="form-row">
                    <div className="form-group full-width"><label>Endereço Completo</label><input type="text" name="endereco" value={adquirentePrincipal.endereco || ''} onChange={handlePrincipalChange} /></div>
                </div>
            </div>

            {coadquirentes.map((coad, index) => (
                <div key={index} className="adquirente-form-section coadquirente">
                    <div className="coadquirente-header"><h4>Coadquirente {index + 1}</h4><button type="button" onClick={() => handleRemoveCoadquirente(index)} className="button-link delete-link">Remover</button></div>
                    {/* --- Repete a mesma estrutura de campos para cada coadquirente --- */}
                    <div className="form-row"><div className="form-group"><label>Nome Completo*</label><input type="text" name="nome" value={coad.nome || ''} onChange={(e) => handleCoadquirenteChange(index, e)} required /></div><div className="form-group"><label>CPF</label><input type="text" name="cpf" value={coad.cpf || ''} onChange={(e) => handleCoadquirenteChange(index, e)} /></div></div>
                    <div className="form-row"><div className="form-group"><label>RG</label><input type="text" name="rg" value={coad.rg || ''} onChange={(e) => handleCoadquirenteChange(index, e)} /></div><div className="form-group"><label>Data de Nascimento</label><input type="date" name="nascimento" value={coad.nascimento ? new Date(coad.nascimento).toISOString().split('T')[0] : ''} onChange={(e) => handleCoadquirenteChange(index, e)} /></div></div>
                    <div className="form-row"><div className="form-group"><label>Estado Civil</label><select name="estadoCivil" value={coad.estadoCivil || ''} onChange={(e) => handleCoadquirenteChange(index, e)}><option value="">Selecione...</option>{ESTADO_CIVIL_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div><div className="form-group"><label>Profissão</label><input type="text" name="profissao" value={coad.profissao || ''} onChange={(e) => handleCoadquirenteChange(index, e)} /></div></div>
                    <div className="form-row"><div className="form-group"><label>Telefone de Contato*</label><input type="tel" name="contato" value={coad.contato || ''} onChange={(e) => handleCoadquirenteChange(index, e)} required/></div><div className="form-group"><label>Email</label><input type="email" name="email" value={coad.email || ''} onChange={(e) => handleCoadquirenteChange(index, e)} /></div></div>
                    <div className="form-row"><div className="form-group full-width"><label>Endereço Completo</label><input type="text" name="endereco" value={coad.endereco || ''} onChange={(e) => handleCoadquirenteChange(index, e)} /></div></div>
                </div>
            ))}
            <button type="button" onClick={handleAddCoadquirente} className="button outline-button">+ Adicionar Coadquirente</button>
        </div>
    );
}
export default StepAdquirentes;