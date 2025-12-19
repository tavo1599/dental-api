import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ToothSurfaceState } from './entities/tooth-surface-state.entity';
import { Tooth } from './entities/tooth.entity';
import { ToothState } from './entities/tooth-state.entity';
import { DentalBridge } from './entities/dental-bridge.entity';
import { UpdateOdontogramDto } from './dto/update-odontogram.dto';
import { CreateToothStateDto } from './dto/create-tooth-state.dto';
import { CreateBridgeDto } from './dto/create-bridge.dto';
import { PatientsService } from '../patients/patients.service';
import { ToothStatus } from '../types/tooth-status.enum';
import { OdontogramRecordType } from './enums/record-type.enum'; // Importar Enum

@Injectable()
export class OdontogramService {
  constructor(
    @InjectRepository(ToothSurfaceState)
    private readonly surfaceRepository: Repository<ToothSurfaceState>,
    @InjectRepository(Tooth)
    private readonly toothRepository: Repository<Tooth>,
    @InjectRepository(ToothState)
    private readonly toothStateRepository: Repository<ToothState>,
    @InjectRepository(DentalBridge)
    private readonly bridgeRepository: Repository<DentalBridge>,
    private readonly patientsService: PatientsService,
  ) {}

  // MODIFICADO: Acepta 'type' opcional (por defecto EVOLUTION)
  async getOdontogram(patientId: string, tenantId: string, type: OdontogramRecordType = OdontogramRecordType.EVOLUTION) {
    await this.patientsService.findOne(patientId, tenantId);

    const wholeTeeth = await this.toothRepository.find({
      where: { patient: { id: patientId }, tenant: { id: tenantId }, recordType: type },
    });
    const surfaces = await this.surfaceRepository.find({
      where: { patient: { id: patientId }, tenant: { id: tenantId }, recordType: type },
    });
    const toothStates = await this.toothStateRepository.find({
      where: { patient: { id: patientId }, tenant: { id: tenantId }, recordType: type },
    });
    const bridges = await this.bridgeRepository.find({
      where: { patient: { id: patientId }, tenant: { id: tenantId }, recordType: type },
    });

    return { wholeTeeth, surfaces, toothStates, bridges, type }; // Devolvemos el tipo para confirmar
  }

  async updateOdontogram(dto: UpdateOdontogramDto, patientId: string, tenantId: string) {
    // Usamos el tipo que viene en el DTO o EVOLUTION por defecto
    const recordType = dto.recordType || OdontogramRecordType.EVOLUTION;

    for (const update of dto.updates) {
      const { toothNumber, status, surface } = update;

      if (surface) { 
        if (status === ToothStatus.HEALTHY) {
          await this.surfaceRepository.delete({ 
             patient: { id: patientId }, 
             toothNumber, 
             surface,
             recordType // Importante borrar del tipo correcto
          });
        } else {
          let state = await this.surfaceRepository.findOneBy({ 
              patient: { id: patientId }, 
              toothNumber, 
              surface,
              recordType 
          });
          
          if (state) { 
             state.status = status; 
          } else {
            state = this.surfaceRepository.create({ 
                toothNumber, surface, status, 
                patient: { id: patientId }, tenant: { id: tenantId },
                recordType // Guardar con el tipo correcto
            });
          }
          await this.surfaceRepository.save(state);
        }
      } else { 
        // Lógica Diente Completo
        if (status === ToothStatus.HEALTHY) {
          await this.toothRepository.delete({ patient: { id: patientId }, toothNumber, recordType });
          // Borrar oclusal asociado
          await this.surfaceRepository.delete({ patient: { id: patientId }, toothNumber, surface: 'occlusal', recordType });
        } else {
          let tooth = await this.toothRepository.findOneBy({ patient: { id: patientId }, toothNumber, recordType });
          
          if (tooth) { 
             tooth.status = status; 
          } else {
            tooth = this.toothRepository.create({ 
                toothNumber, status, 
                patient: { id: patientId }, tenant: { id: tenantId },
                recordType
            });
          }
          await this.toothRepository.save(tooth);
          
          // Oclusal automático para visualización
          let oclusalState = await this.surfaceRepository.findOneBy({ patient: { id: patientId }, toothNumber, surface: 'occlusal', recordType });
          if (oclusalState) { 
              oclusalState.status = status; 
          } else {
            oclusalState = this.surfaceRepository.create({ 
                toothNumber, surface: 'occlusal', status, 
                patient: { id: patientId }, tenant: { id: tenantId },
                recordType
            });
          }
          await this.surfaceRepository.save(oclusalState);
        }
      }
    }
    return this.getOdontogram(patientId, tenantId, recordType);
  }

  async saveToothState(dto: CreateToothStateDto, patientId: string, tenantId: string) {
    const recordType = dto.recordType || OdontogramRecordType.EVOLUTION;
    await this.patientsService.findOne(patientId, tenantId);

    let existingState = await this.toothStateRepository.findOne({
      where: { 
          patient: { id: patientId }, 
          toothNumber: dto.toothNumber, 
          condition: dto.condition,
          recordType // Filtrar por tipo
      },
    });

    if (existingState) {
      Object.assign(existingState, dto);
      return this.toothStateRepository.save(existingState);
    } else {
      const newState = this.toothStateRepository.create({
        ...dto,
        patient: { id: patientId },
        tenant: { id: tenantId },
        recordType // Asignar tipo
      });
      return this.toothStateRepository.save(newState);
    }
  }

  async clearToothState(id: string, tenantId: string) {
    // Aquí asumimos que el ID es único globalmente, así que no necesitamos filtrar por recordType para borrar
    const result = await this.toothStateRepository.delete({ id, tenant: { id: tenantId } });
    if (result.affected === 0) throw new NotFoundException('Estado no encontrado.');
  }

  async saveBridge(dto: CreateBridgeDto, patientId: string, tenantId: string) {
    const recordType = dto.recordType || OdontogramRecordType.EVOLUTION;
    await this.patientsService.findOne(patientId, tenantId);
    
    const bridge = this.bridgeRepository.create({
      ...dto,
      patient: { id: patientId },
      tenant: { id: tenantId },
      recordType // Asignar tipo
    });
    return this.bridgeRepository.save(bridge);
  }

  async removeBridge(bridgeId: string, tenantId: string) {
    const result = await this.bridgeRepository.delete({ id: bridgeId, tenant: { id: tenantId } });
    if (result.affected === 0) throw new NotFoundException('Puente no encontrado.');
  }
}