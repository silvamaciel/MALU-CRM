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
        adquirentes[0] = { ...adquirentes[0], [name]: value };
        setFormData({ ...formData, adquirentes });
    };

    // Handler para mudar campos de um coadquirente específico
    const handleCoadquirenteChange = (index, e) => {
        const { name, value } = e.target;
        const adquirentes = [...formData.adquirentes];
        // O índice para coadquirentes no array é 'index + 1'
        adquirentes[index + 1] = { ...adquirentes[index + 1], [name]: value };
        setFormData({ ...formData, adquirentes });
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
                <div className="form-row">
                    <div className="form-group">
                        <label>Nome Completo*</label>
                        <input type="text" name="nome" value={adquirentePrincipal.nome || ''} onChange={handlePrincipalChange} required />
                    </div>
                    <div className="form-group">
                        <label>CPF</label>
                        <input type="text" name="cpf" value={adquirentePrincipal.cpf || ''} onChange={handlePrincipalChange} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>RG</label>
                        <input type="text" name="rg" value={adquirentePrincipal.rg || ''} onChange={handlePrincipalChange} />
                    </div>
                    <div className="form-group">
                        <label>Estado Civil</label>
                        <select name="estadoCivil" value={adquirentePrincipal.estadoCivil || ''} onChange={handlePrincipalChange}>
                            <option value="">Selecione...</option>
                            {ESTADO_CIVIL_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                </div>
                 <div className="form-row">
                    <div className="form-group">
                        <label>Profissão</label>
                        <input type="text" name="profissao" value={adquirentePrincipal.profissao || ''} onChange={handlePrincipalChange} />
                    </div>
                     <div className="form-group">
                        <label>Nacionalidade</label>
                        <input type="text" name="nacionalidade" value={adquirentePrincipal.nacionalidade || ''} onChange={handlePrincipalChange} />
                    </div>
                </div>
            </div>

            {coadquirentes.map((coad, index) => (
                <div key={index} className="adquirente-form-section coadquirente">
                    <div className="coadquirente-header">
                        <h4>Coadquirente {index + 1}</h4>
                        <button type="button" onClick={() => handleRemoveCoadquirente(index)} className="button-link delete-link">Remover</button>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Nome Completo*</label>
                            <input type="text" name="nome" value={coad.nome || ''} onChange={(e) => handleCoadquirenteChange(index, e)} required />
                        </div>
                        <div className="form-group">
                            <label>CPF</label>
                            <input type="text" name="cpf" value={coad.cpf || ''} onChange={(e) => handleCoadquirenteChange(index, e)} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>RG</label>
                            <input type="text" name="rg" value={coad.rg || ''} onChange={(e) => handleCoadquirenteChange(index, e)} />
                        </div>
                        <div className="form-group">
                            <label>Estado Civil</label>
                            <select name="estadoCivil" value={coad.estadoCivil || ''} onChange={(e) => handleCoadquirenteChange(index, e)}>
                                 <option value="">Selecione...</option>
                                {ESTADO_CIVIL_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Profissão</label>
                            <input type="text" name="profissao" value={coad.profissao || ''} onChange={(e) => handleCoadquirenteChange(index, e)} />
                        </div>
                        <div className="form-group">
                            <label>Nacionalidade</label>
                            <input type="text" name="nacionalidade" value={coad.nacionalidade || ''} onChange={(e) => handleCoadquirenteChange(index, e)} />
                        </div>
                    </div>
                </div>
            ))}

            <button type="button" onClick={handleAddCoadquirente} className="button outline-button" style={{marginTop: '15px'}}>
                + Adicionar Coadquirente
            </button>
        </div>
    );
}
export default StepAdquirentes;